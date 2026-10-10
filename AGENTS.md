# Hireland agent instructions

## Project and handoff

- Read `Doc/HANDOFF.md` and `Doc/01_MONOLITH_PLAN.md` before changing implementation. M0 decisions are in `Doc/03_M0_DECISIONS.md`.
- Build one full-stack monolith with one application entry point, one port and one local SQLite database. The historical PRD's three-app architecture is superseded.
- Complete the requested milestone, verify actual behavior, then update the handoff. Do not claim real provider calls, user feedback or sandbox transactions without evidence.
- The user explicitly authorizes local commits at the end of every work turn. Commit your relevant changes after checks; do not automatically push or deploy. This supersedes older prompts saying not to commit. Preserve unrelated user changes and never commit secrets.

## Current documentation (user-provided Context7 rule)

Use Context7 for library/framework/SDK/API/CLI/cloud-service questions and implementation details, even if familiar. Do not use it just for general programming, business logic, refactoring or review.

1. Resolve the library name first unless an exact `/org/project` ID was provided.
2. Select the closest reputable match; use version-specific documentation when available.
3. Query one concept per call; separate unrelated concepts.
4. Base implementation on fetched docs. If unavailable, report the limitation and consult official sources.

## Credentials and demo data

- Keep keys in ignored `.env.local`; never print them or include them in evidence.
- Stripe sandbox only. AI checks use fictional inputs. Clearly distinguish synthetic content, simulated errors and real evidence.
- No destructive database reset on startup. Do not overwrite payment/user evidence during seed or tests.
