-- Site-wide daily limits count every submission to a form, so form_log also needs an index by form.
-- City suggestions now use form_log like every other form; suggestion_log is no longer written and is kept only as history.
CREATE INDEX form_log_kind ON form_log (kind, created_at);
