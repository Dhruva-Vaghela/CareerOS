# CareerOS AI — Project Roadmap

> **Source of truth:** `docs/careeros-ai-architecture.md`
>
> **Supporting repository guidance:** `CLAUDE.md`, `PRODUCT_CONTEXT.md`, `AI_ARCHITECTURE.md`
>
> This roadmap is derived only from repository documentation. It does **not** use `Prompts.pdf` or any other external/project-uploaded prompt sequence.

## 1. Roadmap Principles

- Implement the MVP defined by `docs/careeros-ai-architecture.md`.
- Preserve documented module boundaries and data ownership.
- Use event-driven communication between modules for personalization and cross-module updates.
- Keep the Career Digital Twin as a context aggregation layer, never a business-data owner.
- Keep deterministic business logic deterministic; use the AI Reasoning Engine only where the architecture calls for AI.
- Do not implement documented future scope during MVP.
- Treat `docs/careeros-ai-architecture.md` as the architecture source of truth.
- If the architecture is silent on an implementation decision, stop and resolve the ambiguity rather than inventing a business rule.

---

## 2. Recommended Implementation Sequence

The architecture defines dependencies between modules. The sequence below follows those dependencies rather than an external prompt order.

### Phase 0 — Repository Foundation

**Goal:** Establish the shared infrastructure required by all services.

- [ ] Confirm monorepo/service structure.
- [ ] Establish `apps/web`.
- [ ] Establish service boundaries under `services/`.
- [ ] Establish shared packages:
  - [ ] `packages/event-bus-client`
  - [ ] `packages/ai-reasoning-client`
  - [ ] `packages/shared-types`
- [ ] Establish authentication/session handling.
- [ ] Establish API conventions under `/api/v1/`.
- [ ] Establish per-service schema/migration conventions.
- [ ] Establish event contract/versioning conventions.
- [ ] Establish shared error handling and reason-code conventions.
- [ ] Establish test infrastructure.
- [ ] Verify user ownership/security boundaries.

### Phase 1 — User Profile

**Owner:** User Profile

**Depends on:** Authentication & Identity

**Purpose:** Maintain the user's core profile used by downstream career features.

- [ ] Implement User Profile domain model.
- [ ] Implement profile persistence and migrations.
- [ ] Implement profile API.
- [ ] Enforce authenticated user ownership.
- [ ] Publish `profile.updated`.
- [ ] Add unit, integration, API, and security tests.

**Downstream consumers:** Career Goals, AI Roadmap Engine, Career Digital Twin, Recommendation Engine.

### Phase 2 — Career Goals

**Owner:** Career Goals

**Depends on:** Authentication & Identity, User Profile

**MVP boundary:** One active career goal.

- [ ] Implement Career Goal domain model.
- [ ] Implement one-active-goal application rule.
- [ ] Implement goal creation/update/archive lifecycle.
- [ ] Implement persistence and migrations.
- [ ] Implement goal APIs.
- [ ] Publish `goal.created`.
- [ ] Publish `goal.changed`.
- [ ] Enforce user ownership.
- [ ] Add validation and business-rule tests.
- [ ] Add event contract tests.

**Downstream consumers:** AI Roadmap Engine, Career Readiness Engine, Recommendation Engine, Career Digital Twin.

### Phase 3 — Skill Tracking

**Owner:** Skill Tracking

**Depends on:** Career Goals and roadmap skill mapping.

**Purpose:** Maintain the user's skill state and skill evidence used by personalization and readiness.

- [ ] Implement Skill and skill-state domain model from architecture.
- [ ] Implement skill-to-roadmap-node mapping.
- [ ] Implement target-role skill requirements.
- [ ] Consume documented skill evidence events.
- [ ] Publish `skill.updated`.
- [ ] Provide documented public APIs.
- [ ] Add skill-gap calculation according to architecture.
- [ ] Add unit, integration, event, and security tests.

**Consumers:** AI Roadmap Engine, Career Readiness Engine, Career Digital Twin, Practice Mode interviews.

### Phase 4 — AI Reasoning Infrastructure

**Owner:** Shared AI Reasoning Layer

**Purpose:** Provide the common AI pipeline used by AI-powered modules.

Architecture requires this flow:

`Application → AI Orchestration → Context Builder → Provider Abstraction → LLM → Response Validator → Application`

- [ ] Implement AI orchestration entry point.
- [ ] Implement task-type routing.
- [ ] Implement context assembly interfaces.
- [ ] Implement provider abstraction.
- [ ] Configure the MVP provider according to repository configuration.
- [ ] Implement provider-agnostic request/response shapes.
- [ ] Implement structured-output validation.
- [ ] Implement bounded retry/fallback behavior.
- [ ] Implement timeout handling.
- [ ] Implement centralized rate-limit handling.
- [ ] Implement prompt/template versioning.
- [ ] Implement AI security boundaries and user-data isolation.
- [ ] Add provider abstraction tests and validator tests.

### Phase 5 — AI Personalized Roadmap Engine

**Owner:** AI Roadmap Engine

**Depends on:** User Profile, Career Goals, Skill Tracking, Learning History/Evidence, Career Digital Twin, AI Reasoning Layer.

**MVP purpose:** Generate a personalized roadmap:

`Roadmap → Module → Topic → Subtopic → Checklist Item`

- [ ] Implement Roadmap domain model.
- [ ] Implement Module, Topic, Subtopic, Checklist Item models.
- [ ] Implement dependencies.
- [ ] Implement Mandatory / Recommended / Optional node types.
- [ ] Implement roadmap generation orchestration.
- [ ] Implement roadmap context retrieval.
- [ ] Implement structured roadmap output validation.
- [ ] Implement dependency-graph validation.
- [ ] Protect Mandatory nodes at the backend.
- [ ] Implement roadmap versioning.
- [ ] Preserve prior versions.
- [ ] Implement generation and regeneration lifecycle.
- [ ] Publish `roadmap.generated`.
- [ ] Publish `roadmap.regenerated`.
- [ ] Publish `roadmap.node.completed`.
- [ ] Implement documented roadmap APIs.
- [ ] Add generation, validation, dependency, versioning, event, and API tests.
- [ ] Add frontend roadmap views and customization allowed by the architecture.

### Phase 6 — Learning Progress Tracking

**Owner:** Learning Progress Tracking / Progress Engine

**Depends on:** Roadmap Engine, Assessments & Quizzes, AI Mock Interview System.

**Purpose:** Calculate evidence-based progress rather than simple checklist completion.

- [ ] Implement progress domain model.
- [ ] Implement append-only progress snapshots.
- [ ] Implement evidence aggregation.
- [ ] Implement roadmap/module/topic/subtopic/checklist progress.
- [ ] Incorporate documented evidence signals.
- [ ] Implement confidence/evidence breakdown.
- [ ] Subscribe to documented evidence events.
- [ ] Publish `progress.updated`.
- [ ] Never expose manual progress editing.
- [ ] Implement progress APIs.
- [ ] Add calculation, aggregation, snapshot, event, API, and integration tests.
- [ ] Build progress UI.

### Phase 7 — Study Planner

**Owner:** Study Planner

**Depends on:** AI Roadmap Engine and User Profile.

**Purpose:** Schedule study activity without owning roadmap completion state.

- [ ] Implement study sessions and scheduling domain model.
- [ ] Track available time according to profile data.
- [ ] Consume roadmap information through documented boundaries.
- [ ] Publish `study_session.logged`.
- [ ] Feed learning-pace information to the Twin through documented events.
- [ ] Keep checklist completion ownership in Roadmap Engine.
- [ ] Implement APIs and UI.
- [ ] Add unit, integration, event, and browser tests.

### Phase 8 — Projects

**Owner:** Projects

**Depends on:** AI Roadmap Engine.

**Purpose:** Provide practical project work aligned to roadmap modules.

- [ ] Implement Project domain model.
- [ ] Implement project-to-roadmap-module mapping.
- [ ] Implement project submission records.
- [ ] Implement project status lifecycle.
- [ ] Implement project history.
- [ ] Publish `project.submitted`.
- [ ] Keep project completion evidence explicitly non-verified where applicable.
- [ ] Do not implement AI project evaluation in MVP.
- [ ] Implement project APIs and UI.
- [ ] Add validation, ownership, event, integration, and browser tests.

### Phase 9 — Assessments & Quizzes

**Owner:** Assessments & Quizzes

**Depends on:** AI Roadmap Engine and Skill Tracking.

**Purpose:** Provide topic quizzes and module assessments and produce evidence.

- [ ] Implement Assessment domain model.
- [ ] Implement Assessment Attempt domain model.
- [ ] Implement topic quizzes.
- [ ] Implement module assessments.
- [ ] Implement question-to-skill mapping.
- [ ] Implement scoring.
- [ ] Publish `assessment.scored`.
- [ ] Feed assessment evidence to downstream consumers through events.
- [ ] Do not implement AI-graded open-ended assessment questions in MVP.
- [ ] Implement APIs and UI.
- [ ] Add scoring, security, event, API, and browser tests.

### Phase 10 — Career Digital Twin

**Owner:** Career Digital Twin

**Depends on:** Domain events from upstream modules.

**Purpose:** Maintain an AI-ready, aggregated context representation. It does not own business data.

**Core partitions:**

- Identity State
- Career Goal State
- Skill State
- Learning State
- Evidence State
- Project State
- Interview State
- Recommendation State
- Readiness State
- Conversation Metadata

- [ ] Implement context store.
- [ ] Implement partition model.
- [ ] Implement event subscriber.
- [ ] Make event handling idempotent.
- [ ] Update only affected partitions.
- [ ] Implement context retrieval interface.
- [ ] Implement partition-aware context builder.
- [ ] Implement context serialization/compression/validation.
- [ ] Implement context versioning.
- [ ] Implement cache/invalidation strategy.
- [ ] Publish `twin.updated` / `twin.context.updated` where specified.
- [ ] Implement documented context APIs.
- [ ] Add synchronization, partition, cache, versioning, event, and security tests.
- [ ] Do not add business-data ownership to the Twin.

### Phase 11 — AI Mock Interview System

**Owner:** AI Mock Interview System

**Depends on:** Career Digital Twin, Skill Tracking, Learning Progress Tracking, Assessments & Quizzes.

The two MVP modes must remain architecturally independent in their AI-context behavior.

#### Practice Mode

- [ ] Implement practice interview sessions.
- [ ] Retrieve relevant Twin context.
- [ ] Generate questions.
- [ ] Adapt difficulty/follow-ups where specified.
- [ ] Evaluate responses.
- [ ] Generate final structured feedback.
- [ ] Persist interview evidence.
- [ ] Publish `interview.completed`.

#### Company Mode

- [ ] Implement company simulation inputs.
- [ ] Keep Twin reads completely out of the interview pipeline.
- [ ] Preserve the no-Twin-read invariant with an enforceable dependency check.
- [ ] Persist interview evidence.
- [ ] Publish `interview.completed`.

**Both modes:**

- [ ] Share the documented evidence shape.
- [ ] Implement structured validation.
- [ ] Implement documented failure/fallback behavior.
- [ ] Add invariant, integration, API, and browser tests.

### Phase 12 — Career Readiness Engine

**Owner:** Career Readiness Engine

**Depends on:** Learning Progress Tracking, AI Mock Interview System, Skill Tracking, Assessments & Quizzes.

**Purpose:** Compute an explainable readiness signal for the user's target role.

- [ ] Implement append-only `ReadinessSnapshot`.
- [ ] Consume `progress.updated`.
- [ ] Consume `interview.completed`.
- [ ] Consume `skill.updated`.
- [ ] Incorporate assessment evidence.
- [ ] Implement readiness breakdown.
- [ ] Handle sparse evidence explicitly.
- [ ] Publish `readiness.updated`.
- [ ] Implement `GET /readiness`.
- [ ] Add unit, fixture, event, API, and sparse-evidence tests.

### Phase 13 — Recommendation Engine

**Owner:** Recommendation Engine

**Depends on:** Career Digital Twin and Career Readiness Engine.

**Purpose:** Generate a small set of concrete next actions from current context and readiness gaps.

- [ ] Implement Recommendation domain model.
- [ ] Retrieve full relevant Twin context.
- [ ] Retrieve readiness breakdown.
- [ ] Generate structured recommendations through AI Reasoning.
- [ ] Validate structured output.
- [ ] Dedupe against active recommendations.
- [ ] Persist recommendation records.
- [ ] Publish `recommendation.generated`.
- [ ] Implement recommendation APIs.
- [ ] Implement dismissal state.
- [ ] Add dedupe, generation, event, API, and integration tests.

### Phase 14 — Productivity

**Owner:** Productivity

**Depends on:** Study Planner and optionally Recommendation Engine.

**Purpose:** Lightweight tasks/reminders.

- [ ] Implement Task domain model.
- [ ] Support optional study-session/recommendation links.
- [ ] Implement in-app reminders.
- [ ] Consume documented optional events.
- [ ] Publish `task.completed` according to the architecture.
- [ ] Handle orphaned linked entities gracefully.
- [ ] Implement APIs and UI.
- [ ] Add unit, integration, and browser tests.
- [ ] Keep AI out of this MVP module.

### Phase 15 — System Integration & MVP Hardening

- [ ] Verify every service owns its own data.
- [ ] Verify no direct cross-schema database joins.
- [ ] Verify cross-module personalization uses events/Twin rather than ad hoc synchronous calls.
- [ ] Verify event schemas have contract tests.
- [ ] Verify event consumers are idempotent.
- [ ] Verify all user data is scoped to the authenticated user.
- [ ] Verify all user-generated free text is sanitized before storage/render.
- [ ] Verify Mandatory roadmap mutations return machine-readable 4xx reason codes.
- [ ] Run the end-to-end happy path:

`Goal set → Roadmap generated → Module completed → Assessment scored → Progress updated → Readiness updated → Recommendation generated`

- [ ] Run the Company Interview no-Twin-read invariant test.
- [ ] Run full unit/integration/contract/browser test suites.
- [ ] Fix architecture violations and documented defects.
- [ ] Confirm no undocumented MVP features have been added.

---

## 3. Explicit MVP Exclusions

Do not build these as MVP features:

- Push notifications
- Calendar sync
- External integrations
- Analytics dashboards
- Trend charts
- Peer review
- AI project evaluation
- Multi-goal support
- AI-graded open-ended assessment questions
- MFA
- Institution SSO

These are explicit architecture boundaries, not backlog items to implement during MVP.

---

## 4. Future Scope

Future work should remain outside the MVP unless the architecture is explicitly updated.

Examples documented by the repository include:

- External learning/certification/calendar/job-board integrations
- Future analytics
- External-resource recommendations
- AI evaluation of project submissions
- Push notifications
- Calendar/task synchronization
- Additional interview formats
- Other future AI capabilities described in `AI_ARCHITECTURE.md`

---

## 5. Definition of Done

A module is considered complete only when:

1. Its documented domain ownership is implemented.
2. Its API follows repository conventions.
3. Its database schema/migrations follow service boundaries.
4. Its event contracts match the architecture.
5. Authentication and user ownership are enforced.
6. Business rules are enforced server-side.
7. Required unit/integration/contract tests exist.
8. Browser/UI behavior is verified where applicable.
9. Error and edge-case behavior is documented and tested.
10. No placeholder implementation remains.
11. No undocumented business rule has been invented.
12. No future-scope functionality has been pulled into the MVP.
