# GitNexus

OpenStock uses GitNexus as a local code-knowledge graph for architecture exploration, dependency impact analysis, and safer changes.

## First-time setup or refresh

Run from the repository root:

```bash
npx gitnexus analyze
```

Check freshness with:

```bash
npx gitnexus status
```

The generated `.gitnexus/` database is machine-local and intentionally ignored. It should not be committed or copied between machines.

## Change workflow

Before editing an existing function, class, or method:

1. Read the repository context from `gitnexus://repo/OpenStock/context`.
2. Run `impact` upstream for the symbol being changed.
3. Review the affected callers and execution flows.
4. Make the smallest coherent change.
5. Run `detect_changes` before committing.

Useful MCP resources:

- `gitnexus://repo/OpenStock/context` — index freshness and repository statistics.
- `gitnexus://repo/OpenStock/clusters` — functional areas.
- `gitnexus://repo/OpenStock/processes` — detected execution flows.
- `gitnexus://repo/OpenStock/process/{name}` — a detailed flow trace.

Useful MCP tools:

- `query` — locate execution flows related to a concept.
- `context` — inspect callers, callees, and flow participation for a symbol.
- `impact` — estimate the blast radius of a proposed symbol change.
- `detect_changes` — map the current diff to affected symbols and flows.
- `rename` — perform graph-aware coordinated renames.

## Current branch

The `Crypto` branch is indexed at commit `6b569d1` with 1,105 symbols, 1,758 relationships, and 56 execution flows. The current graph identifies the existing Finnhub quote path, TradingView watchlist widget, MongoDB watchlist/alert models, and Inngest alert worker as the main seams for the Markets/Crypto work.
