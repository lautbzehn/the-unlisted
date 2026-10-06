// Shared helpers for the paid research steps: one client, batch submit/collect, and a hard spending cap.
// Everything runs through the Message Batches API (half price, results usually within an hour).
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

export const MODEL = 'claude-opus-5-5';
export const BUDGET_USD = Number(process.env.BUDGET_USD ?? 90); // hard cap, $10 under the $100 credit

// Batch prices in USD per million tokens (50% of standard), plus $10 per 1,000 web searches.
// Source: platform.claude.com/docs/en/about-claude/pricing, checked Oct 2026.
const PRICE = { input: 2, cacheWrite: 2.5, cacheRead: 0.1, output: 10, perSearch: 0.01 };

const ROOT = new URL('../../../', import.meta.url);
export const file = (p) => new URL(p, ROOT);
export const readJson = (p, fallback) => (existsSync(file(p)) ? JSON.parse(readFileSync(file(p), 'utf8')) : fallback);
export const writeJson = (p, data) => {
  mkdirSync(new URL('.', file(p)), { recursive: true });
  writeFileSync(file(p), JSON.stringify(data, null, 2) + '\n');
};

export function costOf(usage = {}) {
  const tokens =
    (usage.input_tokens ?? 0) * PRICE.input +
    (usage.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite +
    (usage.cache_read_input_tokens ?? 0) * PRICE.cacheRead +
    (usage.output_tokens ?? 0) * PRICE.output;
  return tokens / 1e6 + (usage.server_tool_use?.web_search_requests ?? 0) * PRICE.perSearch;
}

// The ledger records every batch and what it really cost, so the cap survives restarts.
const LEDGER = 'data/review/spend.json';
export const ledger = () => readJson(LEDGER, { budgetUSD: BUDGET_USD, spentUSD: 0, batches: [] });
const saveLedger = (l) => writeJson(LEDGER, l);
const reserved = (l) => l.batches.filter((b) => b.status === 'submitted').reduce((s, b) => s + b.reserveUSD, 0);

export function budgetReport() {
  const l = ledger();
  return `spent $${l.spentUSD.toFixed(2)} · reserved for running batches $${reserved(l).toFixed(2)} · cap $${BUDGET_USD.toFixed(2)}`;
}

function client() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('\nNo API key found. Create one at platform.claude.com (Settings > API keys), then put this line in a file');
    console.error('named .env in the project folder:   ANTHROPIC_API_KEY=your-key-here');
    console.error('and run the command with:           node --env-file=.env scripts/pipeline/...\n');
    process.exit(1);
  }
  return new Anthropic();
}

// Submit only if the worst case for this batch still fits under the cap.
export async function submitBatch(kind, requests, reservePerRequest) {
  const l = ledger();
  const reserveUSD = requests.length * reservePerRequest;
  const worst = l.spentUSD + reserved(l) + reserveUSD;
  if (worst > BUDGET_USD) {
    console.error(`Not submitting: worst case $${worst.toFixed(2)} would pass the $${BUDGET_USD} cap. ${budgetReport()}`);
    process.exit(1);
  }
  const batch = await client().messages.batches.create({ requests });
  l.batches.push({ id: batch.id, kind, submitted: new Date().toISOString(), requests: requests.length, reserveUSD, status: 'submitted' });
  saveLedger(l);
  console.log(`Submitted ${kind} batch ${batch.id} with ${requests.length} requests (worst case $${reserveUSD.toFixed(2)}).`);
  return batch.id;
}

// Wait for a batch, hand each result to onResult, then record the real cost.
export async function collectBatch(id, onResult, { maxWaitMin = 55 } = {}) {
  const c = client();
  const started = Date.now();
  let batch = await c.messages.batches.retrieve(id);
  while (batch.processing_status !== 'ended') {
    if (Date.now() - started > maxWaitMin * 60_000) {
      console.log(`Batch ${id} is still running (${batch.request_counts.processing} left). Run collect again later.`);
      return null;
    }
    console.log(`…${batch.request_counts.processing} still processing`);
    await new Promise((r) => setTimeout(r, 60_000));
    batch = await c.messages.batches.retrieve(id);
  }
  let cost = 0;
  const perItem = {};
  for await (const r of await c.messages.batches.results(id)) {
    const msg = r.result.type === 'succeeded' ? r.result.message : null;
    const usd = msg ? costOf(msg.usage) : 0;
    cost += usd;
    perItem[r.custom_id] = +usd.toFixed(4);
    onResult(r.custom_id, msg, msg ? null : r.result.type);
  }
  const l = ledger();
  const entry = l.batches.find((b) => b.id === id);
  if (entry && entry.status !== 'collected') {
    Object.assign(entry, { status: 'collected', costUSD: +cost.toFixed(4), perItem });
    l.spentUSD = +(l.spentUSD + cost).toFixed(4);
    saveLedger(l);
  }
  const n = Object.keys(perItem).length;
  console.log(`Batch ${id}: ${n} results, real cost $${cost.toFixed(2)} ($${(cost / Math.max(n, 1)).toFixed(3)} each). ${budgetReport()}`);
  return { cost, perItem };
}

// Pull the last JSON block out of the model's final text.
export function extractJson(msg) {
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const fenced = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1]);
  for (const candidate of [...fenced.reverse(), text]) {
    try { return JSON.parse(candidate.trim()); } catch {}
  }
  return null;
}

export const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
