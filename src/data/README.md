# `edgar-snapshot.json`

Ten real companies' key financials (revenue, EBIT, D&A, cash, debt, shares, and more), extracted from SEC EDGAR's `companyfacts` API for Rungs 4-5.

This is a point-in-time snapshot, not live data — SEC EDGAR has no CORS support, so the browser cannot fetch it directly; see PLAN.md section (h).

Regenerate it with `DEAL_DESK_CONTACT="<contact address>" node scripts/fetch-edgar.mjs` from the project root (owner-run, not CI — log the date in `TASKS.md`).
