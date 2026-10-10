# Copy-paste Prompt — Developer A (Job Discovery)

You are Developer A on the Hireland HackUCD 2026 team. Build an **independently runnable** full-stack module in `apps/job-discovery/` ONLY.

FIRST, read these files in the repository and treat them as authoritative contracts:
- `README.md`
- `docs/00_MASTER_PRD.md`
- `docs/01_ARCHITECTURE.md`
- `docs/02_API_CONTRACT.md`
- `docs/03_DEV_STANDARDS.md`
- `docs/modules/A_JOB_DISCOVERY.md`
- `contracts/job-snapshot.schema.json`
- `contracts/demo-jobs.json`

## Hard constraints

- Backend must be **Java 21, Spring Boot 3.x, Maven Wrapper, Spring Web, Validation, Spring Data JPA, H2 file DB**. Backend port `8081`.
- Frontend must be **React + TypeScript + Vite + Tailwind**. Frontend port `5173`.
- No Docker, no cloud deployment, no dependency on running modules B or C.
- Work **only** within `apps/job-discovery/`; do not edit other module directories or shared contracts.
- Follow exact public REST endpoints/JSON fields in `docs/02_API_CONTRACT.md`.
- Import or copy demo fixture records without changing their `jobKey`.
- Do not claim synthetic positions are real openings or circumvent website anti-bot/security restrictions.
- Before coding, briefly state your proposed file structure and acceptance checklist, then implement.

## Deliver P0 features

1. Search/filter job list and job detail with source URL and last-checked timestamp; clearly label synthetic data.
2. Backend job ingestion abstraction, legal public job feed if available, seed fallback, stable jobKey, deduplication, manual `POST /api/v1/jobs/refresh`.
3. Company Watchlist (add/remove/list) and in-app notifications when newly inserted jobs match a watched company. Provide a clearly labeled synthetic demo source where one job appears only on the first manual Refresh after onboarding, so notifications can be tested deterministically; never present this as a real job posting.
4. `GET /api/v1/jobs/export?limit=50` returning a raw JobSnapshot array usable by B and C.
5. From job detail, optional cross-app links to `http://localhost:5174/jobs/{jobKey}` and `http://localhost:5175/jobs/{jobKey}/discussion` without depending on whether those apps are running.

## Deliver code and verification

- Spring service/controller/repository/dto layering, robust validation and standardized error responses.
- Useful UI loading/empty/error states; mobile-friendly layout, consistent design.
- At least one passing test proving job deduplication and one proving watchlist notifications.
- Module-specific README with launch commands, expected env vars, API requests, seed vs real source distinction, and limitations.
- Use only legal/public accessible job data. If live ingest is unavailable, finish a working seeded demo instead of delivering a broken app.

## Final report

List exactly what files you created, commands to run backend/frontend, APIs implemented, tests you ran/results, remaining work, and any deviation from contracts. DO NOT rewrite the whole monorepo or modify modules B/C.
