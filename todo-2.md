# CareerOS AI — TODO

> **Repository-only execution checklist.**
>
> Source of truth: `docs/careeros-ai-architecture.md`
>
> Also follow: `CLAUDE.md`, `PRODUCT_CONTEXT.md`, `AI_ARCHITECTURE.md`
>
> **Do not use `Prompts.pdf` as an implementation source.**

## Start Instructions

Before working on any module or feature, follow this order strictly:

1. **Build the Backend First**
   - Implement the backend/domain logic, database/schema changes, APIs, validation, events, and required business rules.
   - Complete the backend implementation before starting the corresponding frontend work.

2. **Build the Frontend Second**
   - After the backend is implemented, build the corresponding frontend UI and integrate it with the backend APIs.
   - Do not consider a feature implemented just because its UI is complete.

3. **Run Test Cases Third**
   - After both backend and frontend implementation are complete, run all applicable test cases.
   - This includes unit tests, integration tests, API/contract tests, event tests, and browser/UI tests where applicable.
   - Fix every failing test before marking the feature complete.

4. **Completion Rule**
   - A task/module is **NOT COMPLETE** until:
     - Backend implementation is complete.
     - Frontend implementation is complete.
     - All applicable test cases have been run.
     - **All applicable tests pass.**
     - No known implementation or test failures remain.
   - Only then change the task checkbox from `[ ]` to `[x]`.

**Required workflow:**

`Backend → Frontend → Run Tests → Fix Failures → All Tests Pass → Mark Complete`

# Current Work

- [x] Establish actual repository implementation status.
- [x] Compare the current codebase against `docs/careeros-ai-architecture.md`.
- [x] Record completed modules in this file only after verifying them in the repository.
- [ ] Work on one module/bounded context at a time.
- [x] Do not mark a task complete based only on documentation.

---

# 1. Foundation

## Repository structure

- [x] `apps/web`
- [x] `services/auth`
- [x] `services/profile`
- [x] `services/career-goals`
- [x] `services/resume`
- [x] `services/digital-twin`
- [x] `services/health-check`
- [x] `services/roadmap-engine`
- [ ] `services/progress-engine`
- [ ] `services/study-planner`
- [ ] `services/skill-tracking`
- [ ] `services/projects`
- [ ] `services/assessments`
- [ ] `services/interview/practice-mode`
- [x] `services/interview/company-mode`
- [ ] `services/career-readiness`
- [ ] `services/recommendation-engine`
- [ ] `services/productivity`
- [x] `packages/ai-client`
- [x] `packages/database`
- [x] `packages/errors`
- [x] `packages/event-bus`
- [x] `packages/logger`
- [x] `packages/shared-types`
- [x] `packages/validation`

## Cross-cutting

- [x] API versioning under `/api/v1/`
- [x] Authentication/session middleware
- [x] Per-service schema/migration conventions
- [x] Shared event-bus client
- [x] Shared AI reasoning client
- [x] Shared domain types
- [x] Error/reason-code conventions
- [x] Input sanitization
- [ ] Contract-test infrastructure
- [x] Integration-test infrastructure
- [ ] Browser-test infrastructure

---

# 2. User Profile

- [x] Domain model
- [x] Repository
- [x] Service
- [x] Controller/API
- [x] Validation
- [x] Persistence/migration
- [x] Ownership/security
- [x] `profile.updated` event
- [x] Unit tests
- [x] Integration tests
- [x] API tests
- [x] Event contract tests
- [x] Browser/UI tests

---

# 3. Career Goals

- [x] Domain model
- [x] One-active-goal rule
- [x] Goal lifecycle
- [x] Repository
- [x] Service
- [x] Controller/API
- [x] Validation
- [x] Persistence/migration
- [x] Ownership/security
- [x] `goal.created`
- [x] `goal.changed`
- [x] Unit tests
- [x] Business-rule tests
- [x] API tests
- [x] Event contract tests
- [x] Browser/UI tests

---

# 4. Skill Tracking

- [ ] Skill domain model
- [ ] Target-role skill requirements
- [ ] Roadmap-node skill mapping
- [ ] Skill evidence aggregation
- [ ] Skill-gap calculation
- [ ] Skill APIs
- [ ] `skill.updated`
- [ ] Ownership/security
- [ ] Unit tests
- [ ] Integration tests
- [ ] Event tests
- [ ] API tests

---

# 5. AI Reasoning Infrastructure

## Orchestration

- [x] Single AI orchestration entry point
- [x] Task-type routing
- [x] Context Builder interface
- [x] Provider abstraction
- [x] Provider/model configuration
- [x] Provider-agnostic request shape
- [x] Provider-agnostic response shape

## Prompt / context architecture

- [x] System Context
- [x] Application Context
- [x] User Context
- [x] Task
- [x] Constraints
- [x] Expected Output Format
- [x] Task-specific context partition selection
- [x] Prompt/template versioning

## Validation / reliability

- [x] Structured output schemas
- [x] Response Validator
- [x] One bounded retry
- [x] Fallback behavior
- [x] Timeouts
- [x] Rate limiting
- [x] AI-call logging without raw user-response content
- [x] Provider abstraction tests
- [x] Schema validation tests
- [x] Failure-path tests

## Security

- [x] Per-user context isolation
- [x] Least-privilege context access
- [x] Secure provider communication
- [x] Untrusted user text treated as data
- [x] No provider SDK imports in business modules

---

# 6. AI Roadmap Engine

## Domain

- [x] Roadmap
- [x] Module
- [x] Topic
- [x] Subtopic
- [x] Checklist Item
- [x] Dependency
- [x] Roadmap version

## Generation

- [x] Goal/profile/skill/context inputs
- [x] Context retrieval
- [x] Structured generation
- [x] Output schema
- [x] Dependency validation
- [x] Mandatory/Recommended/Optional classification

## Business rules

- [x] Mandatory nodes cannot be structurally removed
- [x] Mandatory dependency protection
- [x] Backend enforcement
- [x] Machine-readable mutation errors

## Lifecycle

- [x] Initial generation
- [x] Versioning
- [x] Regeneration
- [x] Preserve prior versions
- [ ] Preserve completed evidence during regeneration

## Events

- [x] `roadmap.generated`
- [ ] `roadmap.regenerated`
- [x] `roadmap.node.completed`

## API / UI

- [x] Generate roadmap
- [x] Active roadmap
- [x] Roadmap history
- [x] Roadmap detail
- [x] Node mutation
- [x] Expand/collapse
- [ ] Search/filter
- [x] Dependency indicators
- [x] Completion indicators
- [x] Version selection
- [x] Loading state
- [x] Error state
- [x] Responsive UI

## Tests

- [x] Unit
- [x] Repository
- [x] Generation
- [x] Schema
- [x] Dependency
- [x] Versioning
- [x] Event contract
- [x] API
- [ ] Browser
- [ ] API
- [ ] Browser

---

# 7. Learning Progress Tracking

- [ ] Progress domain model
- [ ] Evidence model
- [ ] Append-only snapshots
- [ ] Overall progress
- [ ] Roadmap progress
- [ ] Module progress
- [ ] Topic progress
- [ ] Subtopic progress
- [ ] Checklist progress
- [ ] Evidence breakdown
- [ ] Confidence
- [ ] Deterministic calculation engine
- [ ] Recalculation triggers
- [ ] `progress.updated`
- [ ] Progress APIs
- [ ] Progress dashboard
- [ ] History/timeline
- [ ] Unit tests
- [ ] Calculation tests
- [ ] Snapshot tests
- [ ] Event tests
- [ ] API tests
- [ ] Browser tests

---

# 8. Study Planner

- [ ] Study-session domain model
- [ ] Scheduling logic
- [ ] Available-time input
- [ ] Roadmap integration
- [ ] Session logging
- [ ] `study_session.logged`
- [ ] Learning-pace signal integration
- [ ] API
- [ ] UI
- [ ] Unit tests
- [ ] Integration tests
- [ ] Event tests
- [ ] Browser tests

---

# 9. Projects

- [ ] Project domain model
- [ ] Project-to-roadmap mapping
- [ ] Submission model
- [ ] Project status lifecycle
- [ ] Project history
- [ ] `project.submitted`
- [ ] Non-verified evidence handling
- [ ] Project APIs
- [ ] Project dashboard
- [ ] Suggested projects
- [ ] Project details
- [ ] Submission form
- [ ] Submission history
- [ ] Validation tests
- [ ] Ownership tests
- [ ] Event tests
- [ ] Browser tests

**MVP guardrail**

- [ ] Do NOT implement AI project evaluation.

---

# 10. Assessments & Quizzes

- [ ] Assessment domain model
- [ ] Assessment Attempt model
- [ ] Topic quizzes
- [ ] Module assessments
- [ ] Question-to-skill mapping
- [ ] Scoring
- [ ] `assessment.scored`
- [ ] Assessment APIs
- [ ] Assessment UI
- [ ] Security tests
- [ ] Scoring tests
- [ ] Event tests
- [ ] API tests
- [ ] Browser tests

**MVP guardrail**

- [ ] Do NOT implement AI-graded open-ended assessment questions.

---

# 11. Career Digital Twin

## Context

- [x] Twin context store
- [x] Identity State
- [x] Career Goal State
- [ ] Skill State
- [ ] Learning State
- [ ] Evidence State
- [ ] Project State
- [ ] Interview State
- [ ] Recommendation State
- [ ] Readiness State
- [ ] Conversation Metadata

## Synchronization

- [x] Event subscriber
- [x] Idempotency
- [x] Duplicate-event handling
- [x] Out-of-order handling
- [x] Affected-partition-only updates
- [x] Context versioning
- [ ] Cache
- [ ] Partition cache
- [ ] Cache invalidation

## Retrieval

- [x] Context Builder
- [x] Partition Resolver
- [x] Context Serializer
- [x] Context Compressor
- [x] Context Validator
- [x] Full context API
- [x] Roadmap context API
- [x] Interview context API
- [x] Chatbot context API
- [x] History API

## Tests

- [x] Partition tests
- [x] Synchronization tests
- [x] Idempotency tests
- [ ] Cache tests
- [x] Context retrieval tests
- [x] API tests
- [x] Integration tests
- [x] Event contract tests

**Guardrail**

- [x] Twin does not own business data.
- [x] No business module directly modifies Twin state.
- [x] No continuous polling of business modules.

---

# 12. AI Mock Interview

## Shared

- [x] Interview session model
- [x] Question model
- [x] Response model
- [x] Feedback model
- [x] Structured validation
- [x] `interview.completed`
- [x] Shared evidence shape
- [x] Session persistence
- [x] Failure/retry/fallback behavior

## Practice Mode

- [ ] Twin context retrieval
- [ ] Skill context
- [ ] Learning/evidence context
- [ ] Question generation
- [ ] Follow-up generation
- [ ] Response evaluation
- [ ] Final feedback
- [ ] Tests

## Company Mode

- [x] Company/role/experience/round inputs
- [x] No Twin context retrieval
- [x] Build-time/lint-level no-Twin dependency check
- [x] Question generation
- [x] Response evaluation
- [x] Final feedback
- [x] Tests

**Critical invariant**

- [x] Company Mode never reads the Digital Twin during the interview.

---

# 13. Career Readiness

- [ ] ReadinessSnapshot
- [ ] Progress evidence input
- [ ] Assessment evidence input
- [ ] Interview evidence input
- [ ] Skill-gap input
- [ ] Readiness calculation
- [ ] Explainable breakdown
- [ ] Sparse-evidence handling
- [ ] Append-only persistence
- [ ] `readiness.updated`
- [ ] `GET /api/v1/readiness`
- [ ] Unit tests
- [ ] Sparse-evidence tests
- [ ] Event tests
- [ ] API tests

---

# 14. Recommendation Engine

- [ ] Recommendation model
- [ ] Twin context retrieval
- [ ] Readiness breakdown retrieval
- [ ] AI generation
- [ ] Structured output validation
- [ ] Active recommendation dedupe
- [ ] Persistence
- [ ] Dismissal state
- [ ] `recommendation.generated`
- [ ] `GET /api/v1/recommendations`
- [ ] `POST /api/v1/recommendations/{id}/dismiss`
- [ ] Unit tests
- [ ] Dedupe tests
- [ ] AI validation tests
- [ ] Event tests
- [ ] Integration tests

---

# 15. Productivity

- [ ] Task model
- [ ] Task API
- [ ] Optional Study Planner link
- [ ] Optional Recommendation link
- [ ] In-app reminders
- [ ] `task.completed`
- [ ] Optional event consumers
- [ ] Orphaned-link handling
- [ ] UI
- [ ] Unit tests
- [ ] Integration tests
- [ ] Browser tests

**MVP guardrail**

- [ ] No push notifications.
- [ ] No calendar sync.
- [ ] No AI required.

---

# 16. System Verification

## Architecture

- [x] One logical schema per service
- [x] No cross-schema database joins
- [x] No cross-module direct data writes
- [x] Public API/event boundaries respected
- [x] Event-driven personalization
- [x] Digital Twin remains non-owning
- [x] AI business-data ownership rules respected

## Security

- [x] Authenticated endpoints require valid session/JWT
- [x] User ownership enforced everywhere
- [x] Service-to-service calls carry authenticated `user_id`
- [x] User-generated free text sanitized
- [x] AI context isolated per user
- [x] Provider credentials centralized

## Events

- [x] Contract test every published event
- [x] Idempotency keys
- [x] Duplicate event handling
- [x] Retry behavior
- [x] Consumer compatibility

## AI

- [x] No business module calls an LLM directly
- [x] All AI requests use orchestration
- [x] Context is task-scoped
- [x] Structured output is validated before business logic
- [x] Invalid output never reaches persistence
- [x] Bounded retry/fallback behavior
- [x] Provider abstraction remains swappable

## End-to-end

- [ ] Goal set
- [ ] Roadmap generated
- [ ] Roadmap node completed
- [ ] Assessment scored
- [ ] Progress updated
- [ ] Readiness updated
- [ ] Recommendation generated
- [ ] Productivity task optionally linked

## Regression

- [x] Unit suite
- [x] Integration suite
- [x] Event contract suite
- [x] API suite
- [ ] Browser suite
- [x] Company Interview no-Twin invariant
- [x] Responsive UI
- [x] Dark mode
- [x] Loading states
- [x] Error states

---

# 17. Explicitly Out of MVP

Keep these unchecked unless the architecture is formally changed:

- [ ] Push notifications
- [ ] Calendar sync
- [ ] External integrations
- [ ] Analytics dashboards
- [ ] Trend charts
- [ ] Peer review
- [ ] AI project evaluation
- [ ] Multi-goal support
- [ ] AI-graded open-ended assessment questions
- [ ] MFA
- [ ] Institution SSO
