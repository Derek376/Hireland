# Copy-paste Prompt — Developer B (AI + Tracker)

You are Developer B on the Hireland HackUCD 2026 team. Build an **independently runnable** full-stack AI Career Assistant and Application Tracker in `apps/ai-career-assistant/` ONLY.

FIRST, read as authoritative:
- `README.md`
- `docs/00_MASTER_PRD.md`
- `docs/01_ARCHITECTURE.md`
- `docs/02_API_CONTRACT.md`
- `docs/03_DEV_STANDARDS.md`
- `docs/modules/B_AI_TRACKER.md`
- `contracts/job-snapshot.schema.json`
- `contracts/demo-jobs.json`

## Hard constraints

- Backend: **Java 21, Spring Boot 3.x, Maven Wrapper, JPA, H2 file database**, port `8082`.
- Frontend: **React + TypeScript + Vite + Tailwind**, port `5174`.
- No Docker, no deployment, **no dependency on Job Discovery A or Community C**.
- Only edit `apps/ai-career-assistant/`; preserve shared contract field names and route paths.
- OpenRouter calls must happen from Java backend only using env `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`; never fake AI results or log CV content.
- Before coding, briefly state file structure and acceptance checklist, then implement.

## Deliver P0 features

1. Local demo-user profile and target sector selection; one General CV upload or replace (`PDF`, `DOCX`, `TXT`, max 3 MB). Parse text in Java with PDFBox/POI; handle empty/unreadable documents gracefully.
2. Own seed JobSnapshot data, `POST /api/v1/jobs/import` idempotent, and manual JD entry to construct a local manual job so your module works when A is offline.
3. `POST /api/v1/ai/match {jobKey}`: actual OpenRouter call with CV+JD; require machine-parseable JSON containing `score` 0..100 and max 2 strengths/gaps; verify fields and clearly label as estimate, not interview odds.
4. `POST /api/v1/ai/should-apply {jobKey}`: real OpenRouter call using CV + target sectors + JD; strictly `YES` or `NO` plus at most one concise sentence of justification. If inputs inadequate, return a 422 error instead of fabricating a NO.
5. Once a CV exists, auto-run Should I Apply for at most 3 visible seeded/imported jobs in the B job list (sequentially, with caching). Other jobs run on demand. Use CV hash + JD hash + model ID for cached results; never return made-up scores on timeout or invalid OpenRouter response.
6. Application Tracker list/create/update/delete; statuses `SAVED`, `APPLIED`, `INTERVIEW`, `OFFER`, `REJECTED`; allow manual jobs not linked to A.

## Verification

- Independent demo: upload a clearly synthetic CV -> select TECH -> choose seeded JD -> real CV Match -> real YES/NO -> track application -> change status.
- At least 1 backend service test; cover CV bad file, AI invalid JSON/timeout, and invalid tracker status (mock external AI during automated tests; manual live API run with valid test key for judging).
- Implement clear loading/error states and avoid leaking resumes in console output.
- Document launch commands, env placeholders, API examples, test results and outstanding work in module README.

## Final report

List files changed, launch steps, tests/results, proof real OpenRouter is invoked, known limitations, and any contract deviations. Do not touch A/C or shared contract files.
