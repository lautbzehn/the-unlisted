// The passport code line (the machine-readable zone) on tickets and place pages: capitals, digits and '<' only.
// No data imports here, so page scripts can use it too.
export const mrzPart = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '<').replace(/^<|<$/g, '');
const MRZ_CITY = { 'bay-area': 'BAY', 'san-diego': 'SAN' };
export const stubCode = (p) => `UNL<${MRZ_CITY[p.metro] ?? 'BAY'}<${mrzPart(p.name)}<<${String(p.score).padStart(3, '0')}`.padEnd(48, '<');
