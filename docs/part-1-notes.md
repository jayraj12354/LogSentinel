# Part 1 — Foundation & Backend Fundamentals

Scope delivered:
- Repository scaffold matching Section 4 (directories created; placeholders where later parts fill in).
- Root tooling config (`package.json`, `.gitignore`, `.env.example`).
- Server package (CommonJS) with Express 4 app, env loader, logger, and health route.
- Raw Node `http` demo (port 4001) for contrast with Express.
- Node fundamentals demos: CommonJS vs ESM modules, async patterns, streams, child process, REPL notes.

How to run (after `npm install` in `server/` and copying `.env.example` to `.env`):
- `npm --prefix server run start` — starts Express on PORT (default 4000)
- `npm --prefix server run http-demo` — raw HTTP server on 4001
- `npm --prefix server run demo:modules:cjs` / `demo:modules:esm`
- `npm --prefix server run demo:async` / `demo:stream` / `demo:process`

Notes:
- `server/src/config/env.js` exits with a clear message if required env vars are missing; for local runs without a DB yet, provide placeholder values in `.env`.
