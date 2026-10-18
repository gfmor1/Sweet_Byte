# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Token-saving rules

**Output style (caveman-lite):** Terse fragments. Drop filler, pleasantries, restating the question, and end-of-turn recaps of what the diff already shows. Never compress code, commands, error messages, or file paths. Switch to normal prose for security warnings, destructive-action confirmations, or when the user is confused.

**Shell output:** Prefer `rtk <cmd>` (Rust Token Killer, https://github.com/rtk-ai/rtk) for noisy commands — `rtk git status`, `rtk git diff`, `rtk npm test`, `rtk mvn test`, etc. It filters/dedupes output before it reaches context. Check `rtk --version` / `rtk gain` first; if `rtk` isn't installed or is the unrelated "Rust Type Kit", run the plain command with `| head`/`| tail`. Bypass rtk when the full raw output is needed.

**Reading and searching:**
- Use Grep/Glob to locate, then Read with `offset`/`limit` for just the needed range; don't read whole large files.
- Don't re-read files just edited or already in context.
- Never dump lockfiles, `node_modules/`, `target/`, `.next/`, build output, or generated files; exclude them from searches.
- Batch independent tool calls in one turn.

**Delegation:** Use subagents (Explore) only for broad sweeps where only the conclusion matters; do simple lookups inline.

**Session hygiene:** `/clear` between unrelated tasks, `/compact` with a focus hint when context grows, prefer a smaller model (Sonnet/Haiku) for routine edits, and keep this file short — it is loaded every session.

**Double-Check:** Ask questions when confused, don't assume you know what the user wants. Ask and double check when in doubt, in order not to output garbage and waste tokens

## Project status

SweetByte is a SOEN 343 (Concordia) academic project: an online dessert ordering and delivery platform with four roles — customers, restaurants, couriers, and operators. The repository is currently a scaffold: there is no source code, build system, or tests yet, so there are no build/lint/test commands to document. Update this file once they exist.

## Intended stack (from README.md)

- Frontend: Next.js (JavaScript or TypeScript)
- Backend: Java with Spring Boot
- Database: Firebase database (README also says PostgreSQL — unresolved, confirm with the team before choosing)
- Auth: Firebase Authentication

## Layout

Top-level directories (each currently contains only an empty README.md) indicate a layered architecture:

- `UI_Layer/` — presumably the Next.js frontend
- `Application_Layer/` — presumably the Spring Boot services/business logic
- `Repository_Layer/` — presumably data access / persistence

Layer-to-directory mappings above are inferred from the names; verify against actual code as it is added.
