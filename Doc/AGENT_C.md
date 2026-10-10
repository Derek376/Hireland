# Copy-paste Prompt — Developer C (Community + Stripe)

You are Developer C on the Hireland HackUCD 2026 team. Build an **independently runnable** full-stack job discussion community with a working Stripe Sandbox paid-unlock flow in `apps/job-community/` ONLY.

FIRST read these contracts:
- `README.md`
- `docs/00_MASTER_PRD.md`
- `docs/01_ARCHITECTURE.md`
- `docs/02_API_CONTRACT.md`
- `docs/03_DEV_STANDARDS.md`
- `docs/modules/C_COMMUNITY_STRIPE.md`
- `contracts/job-snapshot.schema.json`
- `contracts/demo-jobs.json`

## Hard constraints

- Backend: **Java 21, Spring Boot 3.x, Maven Wrapper, Spring Web, Validation, Data JPA, H2 file DB**, port `8083`.
- Frontend: **React + TypeScript + Vite + Tailwind**, port `5175`.
- No Docker/cloud deployment; no need for A job list or B user/profile to exist. Seed independent discussion topics and comments.
- Work ONLY in `apps/job-community/` (read but do not modify shared contracts).
- Stripe backend uses test-mode secret key (`sk_test_...`), test Checkout only; €0.99 EUR per topic one-time payment. DO NOT process live funds.
- Before coding, briefly propose your file structure and acceptance checklist, then implement.

## Deliver P0 features

1. Discussion topic directory searchable by company/job title; manually create topics independently; `POST /api/v1/jobs/import` idempotently syncs JobSnapshots from A later.
2. Comment display and submission; 6+ clearly synthetic demo comments on at least one topic; free accounts may read only the 3 most recent comments; server-side gating must prevent pagination or query tampering from returning hidden comments.
3. Backend creates Stripe Checkout Session using Java Stripe SDK and records pending order with demo user `demo-student-1`, topicId, intended EUR 99 cents; redirect to Stripe hosted Checkout.
4. On success page, POST sessionId to backend; retrieve the Checkout Session from Stripe using secret key. Verify payment_status is `paid`, session belongs to the expected user/topic, and amount/currency match. Only then persist an idempotent entitlement for that user and topic.
5. After verified payment, comments endpoint returns all comments (paginated); after cancel/failed/invalid session, access remains restricted.
6. Show a plainly worded “community reports are unverified” disclaimer.

## Test and deliver

- Build an independent demo with A/B off: select seeded topic -> read three preview comments -> click unlock -> complete a real Stripe **sandbox** purchase -> backend verifies Stripe session -> unlock six-plus comments -> reload stays unlocked.
- Add at least one backend service test for free comment access control and one for idempotent purchase confirmation using a mock/stub Stripe client in unit tests. Do not claim mock tests are a successful real sandbox purchase.
- Validate invalid comment content and unknown topics; show payment loading/failed/cancel states.
- Document test mode setup, `.env` names (never secrets), commands, test outcomes and caveats. A URL `success=true` must NEVER unlock content.

## Final report

List files created, run commands, implemented APIs, tests results, exactly how to manually verify a real Stripe test-mode checkout, and any contract deviation. Do not edit A/B or shared contracts.
