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

- [ ] Establish actual repository implementation status.
- [ ] Compare the current codebase against `docs/careeros-ai-architecture.md`.
- [ ] Record completed modules in this file only after verifying them in the repository.
- [ ] Work on one module/bounded context at a time.
- [ ] Do not mark a task complete based only on documentation.

---

# 1. Foundation

## Repository structure

- [ ] `apps/web`
- [ ] `services/auth`
- [ ] `services/profile`
- [ ] `services/career-goals`
- [ ] `services/roadmap-engine`
- [ ] `services/progress-engine`
- [ ] `services/study-planner`
- [ ] `services/skill-tracking`
- [ ] `services/projects`
- [ ] `services/assessments`
- [ ] `services/interview/practice-mode`
- [ ] `services/interview/company-mode`
- [ ] `services/career-readiness`
- [ ] `services/recommendation-engine`
- [ ] `services/productivity`
- [ ] `services/digital-twin`
- [ ] `packages/event-bus-client`
- [ ] `packages/ai-reasoning-client`
- [ ] `packages/shared-types`

## Cross-cutting

- [ ] API versioning under `/api/v1/`
- [ ] Authentication/session middleware
- [ ] Per-service schema/migration conventions
- [ ] Shared event-bus client
- [ ] Shared AI reasoning client
- [ ] Shared domain types
- [ ] Error/reason-code conventions
- [ ] Input sanitization
- [ ] Contract-test infrastructure
- [ ] Integration-test infrastructure
- [ ] Browser-test infrastructure

---

# 2. User Profile

- [ ] Domain model
- [ ] Repository
- [ ] Service
- [ ] Controller/API
- [ ] Validation
- [ ] Persistence/migration
- [ ] Ownership/security
- [ ] `profile.updated` event
- [ ] Unit tests
- [ ] Integration tests
- [ ] API tests
- [ ] Event contract tests
- [ ] Browser/UI tests

---

# 3. Career Goals

- [ ] Domain model
- [ ] One-active-goal rule
- [ ] Goal lifecycle
- [ ] Repository
- [ ] Service
- [ ] Controller/API
- [ ] Validation
- [ ] Persistence/migration
- [ ] Ownership/security
- [ ] `goal.created`
- [ ] `goal.changed`
- [ ] Unit tests
- [ ] Business-rule tests
- [ ] API tests
- [ ] Event contract tests
- [ ] Browser/UI tests

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

- [ ] Single AI orchestration entry point
- [ ] Task-type routing
- [ ] Context Builder interface
- [ ] Provider abstraction
- [ ] Provider/model configuration
- [ ] Provider-agnostic request shape
- [ ] Provider-agnostic response shape

## Prompt / context architecture

- [ ] System Context
- [ ] Application Context
- [ ] User Context
- [ ] Task
- [ ] Constraints
- [ ] Expected Output Format
- [ ] Task-specific context partition selection
- [ ] Prompt/template versioning

## Validation / reliability

- [ ] Structured output schemas
- [ ] Response Validator
- [ ] One bounded retry
- [ ] Fallback behavior
- [ ] Timeouts
- [ ] Rate limiting
- [ ] AI-call logging without raw user-response content
- [ ] Provider abstraction tests
- [ ] Schema validation tests
- [ ] Failure-path tests

## Security

- [ ] Per-user context isolation
- [ ] Least-privilege context access
- [ ] Secure provider communication
- [ ] Untrusted user text treated as data
- [ ] No provider SDK imports in business modules

---

# 6. AI Roadmap Engine

## Domain

- [ ] Roadmap
- [ ] Module
- [ ] Topic
- [ ] Subtopic
- [ ] Checklist Item
- [ ] Dependency
- [ ] Roadmap version

## Generation

- [ ] Goal/profile/skill/context inputs
- [ ] Context retrieval
- [ ] Structured generation
- [ ] Output schema
- [ ] Dependency validation
- [ ] Mandatory/Recommended/Optional classification

## Business rules

- [ ] Mandatory nodes cannot be structurally removed
- [ ] Mandatory dependency protection
- [ ] Backend enforcement
- [ ] Machine-readable mutation errors

## Lifecycle

- [ ] Initial generation
- [ ] Versioning
- [ ] Regeneration
- [ ] Preserve prior versions
- [ ] Preserve completed evidence during regeneration

## Events

- [ ] `roadmap.generated`
- [ ] `roadmap.regenerated`
- [ ] `roadmap.node.completed`

## API / UI

- [ ] Generate roadmap
- [ ] Active roadmap
- [ ] Roadmap history
- [ ] Roadmap detail
- [ ] Node mutation
- [ ] Expand/collapse
- [ ] Search/filter
- [ ] Dependency indicators
- [ ] Completion indicators
- [ ] Version selection
- [ ] Loading state
- [ ] Error state
- [ ] Responsive UI

## Tests

- [ ] Unit
- [ ] Repository
- [ ] Generation
- [ ] Schema
- [ ] Dependency
- [ ] Versioning
- [ ] Event contract
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

- [ ] Twin context store
- [ ] Identity State
- [ ] Career Goal State
- [ ] Skill State
- [ ] Learning State
- [ ] Evidence State
- [ ] Project State
- [ ] Interview State
- [ ] Recommendation State
- [ ] Readiness State
- [ ] Conversation Metadata

## Synchronization

- [ ] Event subscriber
- [ ] Idempotency
- [ ] Duplicate-event handling
- [ ] Out-of-order handling
- [ ] Affected-partition-only updates
- [ ] Context versioning
- [ ] Cache
- [ ] Partition cache
- [ ] Cache invalidation

## Retrieval

- [ ] Context Builder
- [ ] Partition Resolver
- [ ] Context Serializer
- [ ] Context Compressor
- [ ] Context Validator
- [ ] Full context API
- [ ] Roadmap context API
- [ ] Interview context API
- [ ] Chatbot context API
- [ ] History API

## Tests

- [ ] Partition tests
- [ ] Synchronization tests
- [ ] Idempotency tests
- [ ] Cache tests
- [ ] Context retrieval tests
- [ ] API tests
- [ ] Integration tests
- [ ] Event contract tests

**Guardrail**

- [ ] Twin does not own business data.
- [ ] No business module directly modifies Twin state.
- [ ] No continuous polling of business modules.

---

# 12. AI Mock Interview

## Shared

- [ ] Interview session model
- [ ] Question model
- [ ] Response model
- [ ] Feedback model
- [ ] Structured validation
- [ ] `interview.completed`
- [ ] Shared evidence shape
- [ ] Session persistence
- [ ] Failure/retry/fallback behavior

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

- [ ] Company/role/experience/round inputs
- [ ] No Twin context retrieval
- [ ] Build-time/lint-level no-Twin dependency check
- [ ] Question generation
- [ ] Response evaluation
- [ ] Final feedback
- [ ] Tests

**Critical invariant**

- [ ] Company Mode never reads the Digital Twin during the interview.

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

- [ ] One logical schema per service
- [ ] No cross-schema database joins
- [ ] No cross-module direct data writes
- [ ] Public API/event boundaries respected
- [ ] Event-driven personalization
- [ ] Digital Twin remains non-owning
- [ ] AI business-data ownership rules respected

## Security

- [ ] Authenticated endpoints require valid session/JWT
- [ ] User ownership enforced everywhere
- [ ] Service-to-service calls carry authenticated `user_id`
- [ ] User-generated free text sanitized
- [ ] AI context isolated per user
- [ ] Provider credentials centralized

## Events

- [ ] Contract test every published event
- [ ] Idempotency keys
- [ ] Duplicate event handling
- [ ] Retry behavior
- [ ] Consumer compatibility

## AI

- [ ] No business module calls an LLM directly
- [ ] All AI requests use orchestration
- [ ] Context is task-scoped
- [ ] Structured output is validated before business logic
- [ ] Invalid output never reaches persistence
- [ ] Bounded retry/fallback behavior
- [ ] Provider abstraction remains swappable

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

- [ ] Unit suite
- [ ] Integration suite
- [ ] Event contract suite
- [ ] API suite
- [ ] Browser suite
- [ ] Company Interview no-Twin invariant
- [ ] Responsive UI
- [ ] Dark mode
- [ ] Loading states
- [ ] Error states

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
