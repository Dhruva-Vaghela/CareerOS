# CareerOS AI — Implementation-Ready Architecture Document

**Status:** MVP Architecture Reference
**Audience:** AI coding agents (Claude Code / Antigravity), senior engineers implementing the MVP
**Purpose:** This document is the primary implementation reference for CareerOS AI. It defines scope, architecture, data flow, domain models, and boundaries for every module so that implementation can proceed without business assumptions. Where a decision is not specified here, it should be treated as **not yet decided** rather than inferred.

---

## 1. Document Conventions

Every module section below follows the same template:

1. **Purpose & Business Problem** — why the module exists
2. **MVP Scope / Future Scope / Implementation Boundaries**
3. **Module Relationships** — upstream dependencies, downstream consumers
4. **Domain Model** — entities, key attributes, relationships
5. **Data Flow** — inputs, outputs, ownership
6. **Workflows** — business, user, internal
7. **Sequence Diagram** (Mermaid) — for modules with non-trivial interaction
8. **Event Flow** — published/subscribed events
9. **AI Interaction** — how it feeds or consumes AI personalization
10. **API & Database Considerations** (documentation only, no code)
11. **Security Considerations**
12. **Error Handling & Edge Cases**
13. **Testing Strategy**
14. **Scalability & Future Extensibility**

Diagrams use Mermaid syntax so they render natively in most Markdown viewers and are directly parseable by AI coding agents.

---

## 2. Product Philosophy (Non-Negotiable Constraints)

These are architectural constraints, not suggestions. Do not redesign them during implementation.

- CareerOS AI is an **operating system for a user's career**, not a chatbot, resume builder, LMS, or course provider. It does not replace external learning resources — it plans, personalizes, evaluates, tracks, recommends, and optimizes.
- Every module is part of **one connected ecosystem**. No module should be implemented as an isolated feature island.
- The **Career Digital Twin** is a cross-cutting intelligence layer, not a business module. It never owns business data — each business module remains the single source of truth for its own domain data.
- **Progress is evidence-based.** Never derive progress from lesson completion alone — it must be computed from checklist completion, quiz performance, assessment performance, and mock interview performance.
- **Mandatory learning dependencies are never skippable.** Personalization applies only to Optional and Recommended content, never to Mandatory prerequisite chains.
- **Company Interview Mode must not use the Digital Twin to personalize questions during the interview** — realism takes priority over coaching in that mode. (It still writes back to the Twin afterward.)

---

## 3. High-Level System Architecture

\`\`\`mermaid
flowchart TB
    subgraph Client["Client Layer"]
        WebApp["Web App"]
    end

    subgraph Gateway["API Gateway"]
        GW["Auth-aware API Gateway"]
    end

    subgraph BusinessModules["Business Modules (Source of Truth for their own data)"]
        AUTH["Authentication & Identity"]
        PROFILE["User Profile"]
        GOALS["Career Goals"]
        ROADMAP["AI Roadmap Engine"]
        PROGRESS["Learning Progress Tracking"]
        PLANNER["Study Planner"]
        SKILLS["Skill Tracking"]
        PROJECTS["Projects"]
        ASSESS["Assessments & Quizzes"]
        INTERVIEW["AI Mock Interview System"]
        READINESS["Career Readiness Engine"]
        RECS["Recommendation Engine"]
        PRODUCTIVITY["Productivity"]
    end

    subgraph Intelligence["Cross-Cutting Intelligence Layer"]
        TWIN["Career Digital Twin\n(context aggregation, no business data ownership)"]
        AIENGINE["AI Reasoning Engine\n(LLM orchestration)"]
    end

    subgraph EventBus["Event Bus (async, module decoupling)"]
        BUS[["Event Bus"]]
    end

    subgraph Data["Persistence"]
        DB[("Relational DB per-module schemas")]
    end

    WebApp --> GW --> BusinessModules
    BusinessModules <--> BUS
    BUS <--> TWIN
    TWIN <--> AIENGINE
    BusinessModules --> DB
    AIENGINE -.->|"generated content, recommendations"| BusinessModules
\`\`\`

**Key architectural rule:** business modules never call each other synchronously for personalization purposes. They publish domain events to the bus; the Digital Twin subscribes, aggregates context, and the AI Reasoning Engine consumes that context on demand. Direct synchronous calls between business modules are permitted only for strict data integrity operations (e.g., Auth validating a session), never for AI personalization.

---

## 4. Career Digital Twin (Cross-Cutting Intelligence Layer)

### 4.1 Architectural Role

The Digital Twin is **not** a business module and does **not** own business data. It exists solely to give every AI feature a fast, unified, pre-aggregated view of a user's career context, so that no AI feature has to independently query and recompute state from every business module on every request.

Think of it as a **read-optimized, continuously-updated context cache** with an AI-consumption interface layered on top — not a database of record.

### 4.2 Context Synchronization Strategy

- Business modules are the source of truth. When a module's state changes in a way that's relevant to personalization, it publishes a domain event.
- The Digital Twin subscribes to these events and updates its own aggregated context representation asynchronously.
- The Twin never polls business modules. It is purely event-driven, which keeps business modules decoupled from the Twin's existence.

### 4.3 Context Update Triggers

Representative (non-exhaustive) list of events that trigger a Twin context update:

- Profile updated (education, target role changed)
- Career Goal created/updated
- Roadmap module/topic marked complete
- Assessment/quiz submitted with a score
- Mock interview completed (either mode) with evaluation results
- Skill marked acquired or self-rated
- Project submitted/completed
- Study Planner session logged

### 4.4 Information Aggregation Strategy

The Twin maintains a structured, versioned context object per user, roughly partitioned into:

- **Identity & Goals** — target role, education, stated interests
- **Skill State** — acquired skills, skill confidence, gaps vs. target role
- **Learning State** — roadmap progress, current module/topic, pace
- **Evidence State** — assessment scores, quiz history, mock interview outcomes, weak concepts
- **Readiness State** — latest Career Readiness Engine output

Each partition is updated independently on its own trigger, avoiding full-context recomputation on every event.

### 4.5 AI Context Retrieval Philosophy

- AI features (Roadmap Engine, Practice Mode Interviews, Recommendation Engine) request context **on demand**, not by subscribing to raw events themselves.
- The Twin exposes a context-retrieval interface that returns only the relevant partitions for the requesting feature (e.g., Practice Mode requests Skill State + Evidence State + Learning State, not the full object).
- This keeps prompt-construction lightweight and avoids leaking irrelevant context into unrelated AI features.

### 4.6 Interaction With Every Business Module

| Module | Publishes to Twin | Consumes from Twin |
|---|---|---|
| User Profile | profile updated | — |
| Career Goals | goal set/changed | — |
| AI Roadmap Engine | module/topic completed | full context (generation-time) |
| Learning Progress Tracking | progress recalculated | — |
| Study Planner | session logged | learning pace |
| Skill Tracking | skill acquired/updated | target-role skill gap |
| Projects | project submitted | — |
| Assessments & Quizzes | assessment/quiz scored | — |
| AI Mock Interview (Practice) | interview completed | full context (question generation) |
| AI Mock Interview (Company) | interview completed | **none during interview**; write-only |
| Career Readiness Engine | readiness recalculated | evidence state |
| Recommendation Engine | — | full context |
| Productivity | session logged | learning pace (optional, future) |

### 4.7 Implementation Boundaries (MVP)

- MVP: Twin is an internal service with a context store (can be a dedicated schema, not a separate database, to avoid premature infrastructure complexity) plus an event subscriber.
- MVP: synchronous "get context" API for AI features; no real-time push to client.
- Future: Twin could be promoted to a dedicated vector-store-backed service for semantic retrieval as data volume grows.

### 4.8 Scalability Considerations

- Context partitions should be independently cacheable (e.g., per-user, per-partition cache keys) so a Skill State update doesn't invalidate Evidence State cache.
- Event consumption must be idempotent — replaying an event (e.g., after a retry) must not double-count evidence.

---

## 5. Authentication & Identity

### 5.1 Purpose & Business Problem
Establishes a verified, secure user identity that every other module trusts. Without this, no personalization, progress tracking, or data ownership claim is meaningful.

### 5.2 MVP Scope
- Email/password + optionally one OAuth provider (e.g., Google) for lower friction in tier-2/3 city user acquisition.
- Session/token issuance (JWT or equivalent), refresh flow, logout.
- Password reset flow.

### 5.3 Future Scope
- Multi-factor authentication.
- Institution-linked SSO (college-issued accounts).
- Device-level session management dashboard.

### 5.4 Implementation Boundaries
- Auth does not store any career/profile data beyond identity essentials (email, hashed password, auth provider IDs). All career data lives in User Profile and other modules, referenced by user ID.

### 5.5 Module Relationships
- **Depends on:** nothing (foundational).
- **Depended on by:** every module, via user ID and session validation.

### 5.6 Domain Model
- `User` (id, email, password_hash, auth_provider, created_at, status)
- `Session` (id, user_id, issued_at, expires_at, refresh_token_hash)

### 5.7 Data Flow
- **Input:** credentials or OAuth token.
- **Output:** session/JWT, user_id.
- **Ownership:** owns only identity/auth records.

### 5.8 Event Flow
- Publishes: `user.registered`, `user.login`, `user.deactivated`.
- Subscribes: none.

### 5.9 AI Interaction
None directly. Auth is a prerequisite for all context (user_id is the key the Twin indexes on).

### 5.10 API & Database Considerations
- REST-style: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/reset-password`.
- DB: dedicated `auth` schema, isolated from all business schemas — no foreign keys from business tables into auth internals beyond `user_id`.

### 5.11 Security Considerations
- Passwords hashed with a strong adaptive hash (e.g., bcrypt/argon2), never reversible encryption.
- Rate limiting on login/reset endpoints.
- Session tokens short-lived; refresh tokens rotated on use.

### 5.12 Edge Cases
- Duplicate registration attempt with existing email → clear, non-enumerating error message.
- Expired/replayed refresh token → force re-login.

### 5.13 Testing Strategy
- Unit: password hashing, token expiry logic.
- Integration: full register → login → refresh → logout flow.

### 5.14 Future Extensibility
Schema should allow adding `auth_provider` types and MFA fields without breaking existing sessions.

---

## 6. User Profile

### 6.1 Purpose & Business Problem
Captures the static and semi-static personal/professional context (education, target role, background) that seeds personalization before any learning history exists.

### 6.2 MVP Scope
- Basic profile fields: name, education level/branch, year of study, target role, interests.
- Profile completeness indicator (drives onboarding nudges).

### 6.3 Future Scope
- Resume import/parsing to pre-fill profile.
- Institution verification.

### 6.4 Module Relationships
- **Depends on:** Authentication & Identity (user_id).
- **Depended on by:** Career Goals, AI Roadmap Engine, Career Digital Twin, Recommendation Engine.

### 6.5 Domain Model
- `Profile` (user_id, name, education_branch, education_year, target_role, interests[], updated_at)

### 6.6 Data Flow
- **Input:** user-entered profile fields.
- **Output:** profile object consumed by Roadmap Engine and Twin.
- **Ownership:** owns all profile fields; single source of truth.

### 6.7 Event Flow
- Publishes: `profile.updated`.
- Subscribes: none.

### 6.8 AI Interaction
Feeds initial context to the Twin before any learning-evidence exists — critical for cold-start roadmap generation.

### 6.9 API & Database Considerations
- `GET/PUT /profile`.
- DB: single `profiles` table keyed by `user_id`.

### 6.10 Security Considerations
Profile data is personal but not highly sensitive; standard access control (user can only read/write own profile) suffices for MVP.

### 6.11 Edge Cases
Incomplete profile should not block core app usage but should reduce roadmap personalization quality (documented, not silently ignored).

### 6.12 Testing Strategy
Unit tests on validation rules (e.g., required fields for roadmap generation).

### 6.13 Future Extensibility
Add versioned profile history if future analytics need to track how targets change over time.

---

## 7. Career Goals

### 7.1 Purpose & Business Problem
Defines the explicit target(s) the entire system optimizes toward — target role, target companies, target timeline.

### 7.2 MVP Scope
- Single active career goal per user (target role + optional target timeline).
- Goal creation/edit.

### 7.3 Future Scope
- Multiple parallel goals with prioritization.
- Goal-recommendation based on market trends (Future Analytics).

### 7.4 Module Relationships
- **Depends on:** User Profile.
- **Depended on by:** AI Roadmap Engine, Career Readiness Engine, Recommendation Engine, Career Digital Twin.

### 7.5 Domain Model
- `CareerGoal` (id, user_id, target_role, target_companies[], target_timeline, status, created_at)

### 7.6 Data Flow
- **Input:** user-selected/entered goal.
- **Output:** active goal object.
- **Ownership:** sole owner of goal records.

### 7.7 Event Flow
- Publishes: `goal.created`, `goal.changed`.
- Subscribes: none.

### 7.8 AI Interaction
Primary driver of Roadmap Engine generation logic and Career Readiness scoring target.

### 7.9 API & Database Considerations
- `POST/PUT /career-goals`, `GET /career-goals/active`.
- DB: `career_goals` table, one active-goal constraint enforced at application layer for MVP (not DB constraint, to keep future multi-goal support easy).

### 7.10 Security Considerations
Standard per-user access control.

### 7.11 Edge Cases
Changing an active goal mid-roadmap must trigger roadmap re-evaluation (not silent staleness) — see Roadmap Engine §8.6.

### 7.12 Testing Strategy
Integration test: goal change → downstream `goal.changed` event → Roadmap Engine reacts.

### 7.13 Future Extensibility
Schema supports multiple goals; MVP just enforces single-active at the application layer.

---

## 8. AI Personalized Roadmap Engine

### 8.1 Purpose & Business Problem
Replaces static, one-size-fits-all learning paths with a generated roadmap tailored to each user's goal, background, and evolving evidence — while still protecting non-negotiable prerequisite structure.

### 8.2 MVP Scope
- Generate a roadmap (Roadmap → Module → Topic → Subtopic → Checklist Item) from: Career Goal, Profile, existing Skills, Learning History, Assessments, Digital Twin context.
- Mark each node Mandatory / Recommended / Optional.
- Allow reordering, notes, deadlines, resource selection, and adding optional topics — but never removal/reordering of Mandatory dependency chains.
- Trigger an assessment/quiz at module completion before progression.

### 8.3 Future Scope
- Multi-path branching roadmaps (alternate valid sequences).
- Roadmap sharing/comparison across users (community proof-of-progress).

### 8.4 Implementation Boundaries
- The Roadmap Engine generates structure and sequencing; it does not itself grade quizzes (Assessments module owns grading) or store raw learning content (external resources are referenced, not hosted).

### 8.5 Module Relationships
- **Depends on:** Career Goals, User Profile, Skill Tracking, Assessments & Quizzes, Career Digital Twin.
- **Depended on by:** Learning Progress Tracking, Study Planner, Career Readiness Engine.

### 8.6 Domain Model
- `Roadmap` (id, user_id, goal_id, status, generated_at, version)
- `Module` (id, roadmap_id, order, title, type[mandatory|recommended|optional])
- `Topic` (id, module_id, order, title, type)
- `Subtopic` (id, topic_id, order, title, type)
- `ChecklistItem` (id, subtopic_id, order, title, completed, resource_ref, user_note, deadline)

Dependency chains are modeled as directed edges between nodes (`DependencyLink`: from_node_id, to_node_id) so that "Mandatory and unremovable" is a structural graph constraint, not just a flag.

### 8.7 Roadmap Lifecycle
1. Goal set/changed → Roadmap Engine requests full Twin context.
2. Roadmap generated (v1), Mandatory/Recommended/Optional nodes assigned.
3. User personalizes Optional/Recommended nodes only (application layer enforces this — Mandatory nodes reject reorder/delete requests).
4. On module completion, an assessment is triggered (via Assessments module) before the next module unlocks.
5. On Career Goal change, roadmap is **re-evaluated**, not silently discarded: unlocked/completed evidence is preserved, remaining structure is regenerated against the new goal, producing a new roadmap version.

### 8.8 Sequence Diagram — Roadmap Generation

\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant GOALS as Career Goals
    participant RE as Roadmap Engine
    participant TWIN as Career Digital Twin
    participant AI as AI Reasoning Engine
    participant PROG as Learning Progress Tracking

    U->>GOALS: Set/confirm career goal
    GOALS-->>RE: goal.created event
    RE->>TWIN: Request context (profile, skills, evidence)
    TWIN-->>RE: Aggregated context
    RE->>AI: Generate roadmap (goal + context)
    AI-->>RE: Structured roadmap (modules/topics/checklist)
    RE->>RE: Tag nodes Mandatory/Recommended/Optional
    RE-->>PROG: roadmap.generated event
    RE-->>U: Roadmap ready
\`\`\`

### 8.9 Event Flow
- Publishes: `roadmap.generated`, `roadmap.node.completed`, `roadmap.regenerated`.
- Subscribes: `goal.changed`, `assessment.scored`, `skill.updated`.

### 8.10 AI Interaction
- Generation-time: full Twin context → AI Reasoning Engine → structured roadmap.
- Ongoing: assessment/quiz results feed back to refine pacing of subsequent modules (e.g., surfacing more Recommended remediation content), without altering Mandatory sequence.

### 8.11 API & Database Considerations
- `POST /roadmaps/generate`, `GET /roadmaps/active`, `PATCH /roadmaps/{id}/nodes/{nodeId}` (personalization actions only, validated against node type).
- DB: normalized roadmap tree tables as above, plus a `dependency_links` table for graph edges.

### 8.12 Security Considerations
- Server-side enforcement (not just UI) that Mandatory nodes cannot be deleted/reordered via API — this must not rely on client trust.

### 8.13 Edge Cases
- User attempts to skip a Mandatory checklist item → reject with explanit reason referencing the dependency.
- Goal changed after roadmap 80% complete → regenerate only remaining structure; do not erase completed evidence.

### 8.14 Testing Strategy
- Unit: dependency-graph validation (Mandatory node protection).
- Integration: goal change → regeneration → evidence preserved.

### 8.15 Scalability & Future Extensibility
- Roadmap versioning (not overwrite-in-place) allows future "compare roadmap v1 vs v2" analytics and safe regeneration.

---

## 9. Learning Progress Tracking (Progress Engine)

### 9.1 Purpose & Business Problem
Provides an accurate, evidence-based measure of how far along a user actually is — not just how much content they've clicked through.

### 9.2 MVP Scope
- Aggregate checklist completion, quiz performance, assessment performance, and mock interview performance into a per-module and per-roadmap progress score.
- Expose progress to UI and to Career Readiness Engine.

### 9.3 Future Scope
- Incorporate future external integrations (e.g., verified certificates, GitHub activity) as additional evidence signals.

### 9.4 Progress Calculation Philosophy
Progress is **never** `completed_checklist_items / total_checklist_items` alone. It is a weighted function of:
- Checklist completion (baseline signal, lowest weight)
- Quiz performance (per-topic correctness)
- Assessment performance (per-module depth check)
- Mock interview performance (applied/communicative competency)

Exact weighting is an implementation detail left to the AI Reasoning Engine / Progress Engine tuning — the architectural requirement is that it must be multi-signal, not single-signal.

### 9.5 Module Relationships
- **Depends on:** AI Roadmap Engine (structure), Assessments & Quizzes, AI Mock Interview System.
- **Depended on by:** Career Readiness Engine, Career Digital Twin, Recommendation Engine.

### 9.6 Domain Model
- `ProgressSnapshot` (id, user_id, roadmap_id, module_id, score, evidence_breakdown_json, computed_at)

### 9.7 Data Flow
- **Input:** checklist events, quiz/assessment scores, interview evaluation results.
- **Output:** progress snapshots.
- **Ownership:** sole owner of computed progress values (other modules must not compute their own progress numbers independently).

### 9.8 Event Flow
- Publishes: `progress.updated`.
- Subscribes: `roadmap.node.completed`, `assessment.scored`, `interview.completed`.

### 9.9 AI Interaction
Feeds Evidence State partition of the Career Digital Twin; consumed by Career Readiness Engine for readiness scoring.

### 9.10 API & Database Considerations
- `GET /progress/{roadmapId}`.
- DB: append-only `progress_snapshots` table (never overwrite — enables progress-over-time analytics later).

### 9.11 Security Considerations
Read access restricted to the owning user (and, in future, institution dashboards with explicit consent).

### 9.12 Edge Cases
Conflicting/out-of-order events (e.g., interview result arrives before quiz result for the same module) must not corrupt the snapshot — recompute from all available evidence rather than incrementally patching.

### 9.13 Testing Strategy
Unit tests on the weighting function using fixture evidence sets with known expected outputs.

### 9.14 Scalability & Future Extensibility
Append-only snapshot design directly supports Future Analytics without schema change.

---

## 10. Study Planner

### 10.1 Purpose & Business Problem
Converts the roadmap into a time-bound, realistic study schedule that fits the user's declared available study time.

### 10.2 MVP Scope
- Let users log available study time/day.
- Suggest a session schedule mapped to upcoming roadmap checklist items.
- Log actual study sessions (self-reported).

### 10.3 Future Scope
- Calendar integration (Google Calendar sync).
- Adaptive re-scheduling based on missed sessions.

### 10.4 Module Relationships
- **Depends on:** AI Roadmap Engine, User Profile (available time).
- **Depended on by:** Career Digital Twin (learning pace signal), Productivity.

### 10.5 Domain Model
- `StudyPlan` (id, user_id, roadmap_id, daily_available_minutes, active)
- `StudySession` (id, study_plan_id, checklist_item_id, planned_at, logged_at, duration_minutes)

### 10.6 Data Flow
- **Input:** roadmap checklist items, user-declared available time.
- **Output:** scheduled sessions, logged session history.
- **Ownership:** owns scheduling and session-log data only; does not own checklist completion state (that's Roadmap Engine's).

### 10.7 Event Flow
- Publishes: `study_session.logged`.
- Subscribes: `roadmap.generated`, `roadmap.node.completed`.

### 10.8 AI Interaction
Session logs feed the Twin's "learning pace" signal, used by the Roadmap Engine to adjust pacing suggestions (not sequence).

### 10.9 API & Database Considerations
- `POST /study-plan`, `GET /study-plan/upcoming`, `POST /study-sessions`.
- DB: `study_plans`, `study_sessions` tables.

### 10.10 Security Considerations
Standard per-user access control; no special sensitivity.

### 10.11 Edge Cases
Missed sessions should not silently vanish — surface as "behind schedule" state rather than being dropped.

### 10.12 Testing Strategy
Unit: schedule-generation logic given a fixed available-time input and roadmap shape.

### 10.13 Future Extensibility
Session table structure supports future calendar-sync without redesign (external_calendar_event_id field reserved).

---

## 11. Skill Tracking

### 11.1 Purpose & Business Problem
Maintains the authoritative record of what skills a user has, at what confidence level, and how that compares to their target role's requirements.

### 11.2 MVP Scope
- Skill list with self-rated confidence + roadmap-derived acquisition (completing mandatory nodes tied to a skill marks it acquired).
- Skill-gap view vs. target role.

### 11.3 Future Scope
- Skill verification via external certificates/assessments beyond CareerOS's own quizzes.

### 11.4 Module Relationships
- **Depends on:** AI Roadmap Engine (skill-to-node mapping), Career Goals (target-role skill requirements).
- **Depended on by:** Career Digital Twin, Recommendation Engine, AI Mock Interview (Practice Mode).

### 11.5 Domain Model
- `Skill` (id, name, category)
- `UserSkill` (user_id, skill_id, confidence_level, source[self_rated|roadmap_derived|assessment_verified], updated_at)
- `TargetRoleSkillRequirement` (target_role, skill_id, required_level)

### 11.6 Data Flow
- **Input:** self-ratings, roadmap completion events, assessment results.
- **Output:** skill-gap analysis vs. target role.
- **Ownership:** sole owner of `UserSkill` records.

### 11.7 Event Flow
- Publishes: `skill.updated`.
- Subscribes: `roadmap.node.completed`, `assessment.scored`.

### 11.8 AI Interaction
Primary input to Roadmap Engine's cold-start generation and to Practice Mode interview question targeting (weak-area focus).

### 11.9 API & Database Considerations
- `GET/PUT /skills`, `GET /skills/gap-analysis`.
- DB: `skills`, `user_skills`, `target_role_skill_requirements`.

### 11.10 Security Considerations
Standard per-user access control.

### 11.11 Edge Cases
Conflicting signals (self-rated "expert" but repeated low quiz scores) should be surfaced, not silently overwritten — confidence level should reflect the most recent verified evidence source when it conflicts with self-rating.

### 11.12 Testing Strategy
Unit: gap-analysis calculation given fixture skill sets and target-role requirements.

### 11.13 Future Extensibility
`source` enum designed to accept future `external_verified` value without migration.

---

## 12. Projects

### 12.1 Purpose & Business Problem
Gives users a place to apply learning to tangible build artifacts, which is both a learning-evidence source and portfolio material.

### 12.2 MVP Scope
- Suggested project briefs tied to roadmap modules.
- User submission (link/description), self-marked completion.

### 12.3 Future Scope
- Peer review, AI-assisted project evaluation, portfolio export.

### 12.4 Module Relationships
- **Depends on:** AI Roadmap Engine (project-to-module mapping).
- **Depended on by:** Learning Progress Tracking (evidence input, future), Career Readiness Engine (future).

### 12.5 Domain Model
- `ProjectBrief` (id, module_id, title, description)
- `ProjectSubmission` (id, user_id, project_brief_id, submission_url, status, submitted_at)

### 12.6 Data Flow
- **Input:** roadmap module context, user submission.
- **Output:** submission records.
- **Ownership:** sole owner of submission data.

### 12.7 Event Flow
- Publishes: `project.submitted`.
- Subscribes: `roadmap.generated`.

### 12.8 AI Interaction
MVP: minimal (submission is evidence but not yet AI-evaluated). Future: AI Reasoning Engine reviews submission content.

### 12.9 API & Database Considerations
- `GET /projects/suggested`, `POST /projects/submissions`.
- DB: `project_briefs`, `project_submissions`.

### 12.10 Security Considerations
Submission URLs should be validated/sanitized before storage and display (avoid stored XSS via link fields).

### 12.11 Edge Cases
Self-marked completion without verification is an MVP limitation — must be explicitly documented as non-verified evidence, and must **not** be weighted as strongly as quiz/assessment evidence in the Progress Engine.

### 12.12 Testing Strategy
Unit: submission validation/sanitization.

### 12.13 Future Extensibility
Schema supports adding an `evaluation_score` column later without breaking existing rows.

---

## 13. Assessments & Quizzes

### 13.1 Purpose & Business Problem
Provides the graded checkpoints that gate roadmap progression and supply the strongest evidence signal to the Progress Engine.

### 13.2 MVP Scope
- Quiz per topic, assessment per module (as triggered by Roadmap Engine).
- Auto-grading for objective question types (MCQ, short structured answer).

### 13.3 Future Scope
- AI-graded open-ended responses with rubric-based feedback.

### 13.4 Module Relationships
- **Depends on:** AI Roadmap Engine (triggers), Skill Tracking (question-to-skill mapping).
- **Depended on by:** Learning Progress Tracking, Career Digital Twin, Career Readiness Engine.

### 13.5 Domain Model
- `Assessment` (id, module_id, type[quiz|module_assessment], questions[])
- `AssessmentAttempt` (id, user_id, assessment_id, answers_json, score, completed_at)

### 13.6 Data Flow
- **Input:** roadmap-triggered assessment request, user answers.
- **Output:** score, per-question breakdown.
- **Ownership:** sole owner of attempt/score records.

### 13.7 Event Flow
- Publishes: `assessment.scored`.
- Subscribes: `roadmap.node.completed` (module-completion trigger).

### 13.8 AI Interaction
Scores feed Progress Engine and Skill Tracking; question generation may itself be AI-assisted (drawing on topic content), documented as an implementation detail of the Assessments module itself.

### 13.9 API & Database Considerations
- `GET /assessments/{moduleId}`, `POST /assessments/{id}/attempts`.
- DB: `assessments`, `assessment_attempts`.

### 13.10 Security Considerations
Prevent answer-key leakage via API responses (never return correct answers before submission).

### 13.11 Edge Cases
Partial submission/timeout handling — must record a partial attempt rather than silently discarding progress.

### 13.12 Testing Strategy
Unit: grading logic per question type. Integration: assessment.scored → progress.updated chain.

### 13.13 Future Extensibility
`answers_json` free-form structure accommodates future open-ended question types without schema migration.

---

## 14. AI Mock Interview System

The MVP contains two **independent** interview modes with deliberately different AI-context rules. Do not merge their pipelines — the Digital Twin usage difference is a core product decision, not an oversight.

### 14.1 Practice Mode

#### 14.1.1 Purpose
Personalized interview coaching that adapts to the user's actual weak areas.

#### 14.1.2 MVP Scope
- Retrieve Twin context (skills, learning progress, completed roadmap nodes, past assessments, previous interviews, weak areas, confidence level) **before** generating questions.
- Adaptive difficulty, follow-up questions, focus on weak concepts, reinforcement of recently learned material.
- Coaching-oriented feedback after completion.

#### 14.1.3 Module Relationships
- **Depends on:** Career Digital Twin (full context), Skill Tracking, Learning Progress Tracking, Assessments & Quizzes.
- **Depended on by:** Progress Engine, Career Readiness Engine, Recommendation Engine, Career Digital Twin (write-back).

#### 14.1.4 Domain Model
- `InterviewSession` (id, user_id, mode=practice, context_snapshot_json, started_at, ended_at)
- `InterviewQuestion` (id, session_id, order, question_text, target_weak_area, difficulty)
- `InterviewResponse` (id, question_id, response_text_or_audio_ref, evaluation_json)
- `InterviewFeedback` (id, session_id, summary, strengths[], weak_areas[], recommendations[])

#### 14.1.5 Sequence Diagram — Practice Mode

\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant IV as Interview Module
    participant TWIN as Career Digital Twin
    participant AI as AI Reasoning Engine
    participant PROG as Progress Engine
    participant READY as Career Readiness Engine

    U->>IV: Start Practice Interview
    IV->>TWIN: Request full context
    TWIN-->>IV: Skills, progress, weak areas, history
    IV->>AI: Generate adaptive question (context)
    AI-->>IV: Question
    IV-->>U: Present question
    U-->>IV: Response
    IV->>AI: Evaluate response + decide follow-up
    AI-->>IV: Evaluation + next question or wrap-up
    Note over IV,AI: Loop until session complete
    IV->>AI: Generate final coaching feedback
    AI-->>IV: Feedback (strengths, weak areas, recommendations)
    IV-->>PROG: interview.completed event
    IV-->>READY: interview.completed event
    IV-->>TWIN: Update context (new weak areas, confidence)
\`\`\`

#### 14.1.6 Event Flow
- Publishes: `interview.completed` (mode=practice).
- Subscribes: none directly (pulls Twin context on-demand at session start rather than subscribing to events).

#### 14.1.7 AI Interaction
This is the canonical "Twin-personalized" AI feature — full read at session start, full write-back at session end.

#### 14.1.8 API & Database Considerations
- `POST /interviews/practice/start`, `POST /interviews/practice/{id}/respond`, `GET /interviews/practice/{id}/feedback`.
- DB: shared `interview_sessions` table with a `mode` discriminator column (see §14.3 for shared schema rationale).

#### 14.1.9 Security Considerations
Response audio/text should be treated as sensitive user-generated content; access restricted to the owning user only.

#### 14.1.10 Edge Cases
Session abandoned mid-interview → must persist partial responses and evaluation for whatever was completed, not discard the session.

#### 14.1.11 Testing Strategy
Integration test simulating a full session including a forced "weak area" fixture, asserting follow-up questions target that area.

---

### 14.2 Company Interview Mode

#### 14.2.1 Purpose
Realistic simulation of an actual company's interview process — signal is realism, not coaching.

#### 14.2.2 MVP Scope
- Question generation driven by: Company, Job Role, Experience Level, Interview Round, Industry Hiring Patterns.
- **Must NOT** consult the Career Digital Twin during the interview — no personalization mid-session.
- Post-completion: evaluate performance, then (only afterward) update Career Digital Twin, Progress Engine, Career Readiness Engine, and generate recommendations.

#### 14.2.3 Module Relationships
- **Depends on:** none of the personalization modules during the interview itself; depends only on static reference data (company/role/round metadata).
- **Depended on by (post-interview only):** Career Digital Twin, Progress Engine, Career Readiness Engine, Recommendation Engine.

#### 14.2.4 Domain Model
Shares `InterviewSession`/`InterviewQuestion`/`InterviewResponse` tables with Practice Mode (discriminated by `mode=company`), plus:
- `CompanyInterviewProfile` (id, company_name, job_role, experience_level, round_type, reference_pattern_notes)

#### 14.2.5 Sequence Diagram — Company Mode

\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant IV as Interview Module
    participant AI as AI Reasoning Engine
    participant TWIN as Career Digital Twin
    participant PROG as Progress Engine
    participant READY as Career Readiness Engine

    U->>IV: Start Company Interview (company, role, round)
    IV->>AI: Generate question (company/role/round only — no Twin call)
    AI-->>IV: Question
    IV-->>U: Present question
    U-->>IV: Response
    IV->>AI: Evaluate response (realistic scoring, no coaching adaptation)
    Note over IV,AI: Loop until round complete — no Twin context read at any point
    IV->>AI: Generate final performance evaluation
    AI-->>IV: Evaluation + recommendations
    IV-->>PROG: interview.completed event (mode=company)
    IV-->>READY: interview.completed event
    IV-->>TWIN: Write-back only (post-interview) — Twin is not read here
\`\`\`

#### 14.2.6 Event Flow
- Publishes: `interview.completed` (mode=company).
- Subscribes: none.

#### 14.2.7 AI Interaction
**Write-only** relationship with the Digital Twin — this is the one AI feature in the whole system that intentionally does not read Twin context before generating output. This must be enforced at the implementation level (e.g., the Company Mode question-generation code path should have no dependency/import path to the Twin's context-retrieval interface at all, not just "chooses not to call it").

#### 14.2.8 API & Database Considerations
- `POST /interviews/company/start`, `POST /interviews/company/{id}/respond`, `GET /interviews/company/{id}/evaluation`.
- DB: same shared interview schema as Practice Mode; `mode` column plus `company_interview_profile_id` foreign key when mode=company.

#### 14.2.9 Security Considerations
Same as Practice Mode; additionally, company/role reference data should be clearly attributed as "simulated, not affiliated with the company" to avoid implying official partnership.

#### 14.2.10 Edge Cases
If `CompanyInterviewProfile` reference data is missing/sparse for a niche company, fall back to industry/role-generic question generation rather than blocking the feature — document this fallback explicitly rather than leaving it as an undefined behavior.

#### 14.2.11 Testing Strategy
- A specific regression test should assert that no Twin-context call occurs anywhere in the Company Mode question-generation path — this is a product-critical invariant, not just a nice-to-have.

### 14.3 Shared Schema Rationale
Both modes share the `interview_sessions` / `questions` / `responses` tables (discriminated by `mode`) because downstream consumers (Progress Engine, Career Readiness Engine) need a single, consistent evidence shape regardless of mode. The **behavioral** difference (Twin read or not) lives entirely in the question-generation service layer, not in the data model.

---

## 15. Career Readiness Engine

### 15.1 Purpose & Business Problem
Synthesizes all evidence into a single, explainable "how ready am I for my target role" signal — the top-level number/status the user actually cares about.

### 15.2 MVP Scope
- Compute a readiness score/status from Progress Engine output, Assessment/Quiz evidence, Interview evidence (both modes), and Skill gap analysis.
- Provide a breakdown, not just a single number (explainability matters for trust).

### 15.3 Future Scope
- Benchmark readiness against real hiring-bar data per company/role (Future Analytics/Integrations).

### 15.4 Module Relationships
- **Depends on:** Learning Progress Tracking, AI Mock Interview System, Skill Tracking, Assessments & Quizzes.
- **Depended on by:** Career Digital Twin, Recommendation Engine.

### 15.5 Domain Model
- `ReadinessSnapshot` (id, user_id, target_role, score, breakdown_json, computed_at)

### 15.6 Data Flow
- **Input:** progress snapshots, interview evaluations, skill-gap analysis.
- **Output:** readiness snapshot (append-only, like Progress Engine).
- **Ownership:** sole owner of readiness computation.

### 15.7 Event Flow
- Publishes: `readiness.updated`.
- Subscribes: `progress.updated`, `interview.completed`, `skill.updated`.

### 15.8 AI Interaction
Consumed by the Recommendation Engine and stored in the Twin's Readiness State partition; may itself use the AI Reasoning Engine to generate a natural-language explanation of the breakdown (not just a raw number).

### 15.9 API & Database Considerations
- `GET /readiness`.
- DB: append-only `readiness_snapshots` table.

### 15.10 Security Considerations
Standard per-user access control.

### 15.11 Edge Cases
Sparse evidence (e.g., user has done zero interviews) must not produce a falsely confident score — breakdown should explicitly flag missing evidence categories rather than defaulting them to zero silently.

### 15.12 Testing Strategy
Unit tests with fixture evidence combinations, including sparse/missing-evidence cases.

### 15.13 Future Extensibility
Append-only design supports future "readiness over time" trend charts without migration.

---

## 16. Recommendation Engine

### 16.1 Purpose & Business Problem
Turns aggregated context and readiness gaps into concrete next actions, so the "operating system" actively guides rather than passively displaying data.

### 16.2 MVP Scope
- Generate a small set of prioritized next-action recommendations (e.g., "revisit X topic," "attempt a mock interview," "add Y optional skill") from full Twin context + latest readiness breakdown.

### 16.3 Future Scope
- External resource recommendations (specific courses/videos) once Future Integrations exist.

### 16.4 Module Relationships
- **Depends on:** Career Digital Twin (full context), Career Readiness Engine.
- **Depended on by:** none (terminal/consumer-facing module).

### 16.5 Domain Model
- `Recommendation` (id, user_id, type, description, priority, source_reason, generated_at, dismissed)

### 16.6 Data Flow
- **Input:** full Twin context, readiness breakdown.
- **Output:** prioritized recommendation list.
- **Ownership:** sole owner of recommendation records (including dismissal state).

### 16.7 Event Flow
- Publishes: `recommendation.generated`.
- Subscribes: `readiness.updated`, `interview.completed`.

### 16.8 AI Interaction
Pure AI-Reasoning-Engine consumer — reads Twin context, generates recommendations, no write-back beyond its own recommendation records.

### 16.9 API & Database Considerations
- `GET /recommendations`, `POST /recommendations/{id}/dismiss`.
- DB: `recommendations` table.

### 16.10 Security Considerations
Standard per-user access control.

### 16.11 Edge Cases
Avoid recommendation spam/duplication — dedupe against currently-active (non-dismissed) recommendations before generating new ones on every trigger.

### 16.12 Testing Strategy
Unit: dedupe logic. Integration: readiness.updated → recommendation.generated → dedupe against existing.

### 16.13 Future Extensibility
`type` enum designed to add `external_resource` type later without schema change.

---

## 17. Productivity

### 17.1 Purpose & Business Problem
Lightweight cross-cutting utility (task/reminder style) that helps users act on Study Planner sessions and Recommendation Engine output day-to-day.

### 17.2 MVP Scope
- Simple task list tied optionally to a study session or recommendation.
- Basic reminders (in-app only, no push notifications for MVP).

### 17.3 Future Scope
- Push notifications, external calendar/task sync.

### 17.4 Module Relationships
- **Depends on:** Study Planner (optional link), Recommendation Engine (optional link).
- **Depended on by:** none directly; optionally feeds Twin's learning-pace signal in future.

### 17.5 Domain Model
- `Task` (id, user_id, title, linked_entity_type, linked_entity_id, due_at, completed)

### 17.6 Data Flow
- **Input:** user-created tasks, optional links to study sessions/recommendations.
- **Output:** task completion state.
- **Ownership:** sole owner of task records.

### 17.7 Event Flow
- Publishes: `task.completed` (future consumers only).
- Subscribes: `study_session.logged` (optional auto-task creation), `recommendation.generated` (optional auto-task creation).

### 17.8 AI Interaction
None required for MVP — intentionally kept as a plain utility module.

### 17.9 API & Database Considerations
- `GET/POST/PATCH /tasks`.
- DB: `tasks` table.

### 17.10 Security Considerations
Standard per-user access control.

### 17.11 Edge Cases
Linked entity deleted/changed (e.g., a dismissed recommendation) → task should remain but lose its link gracefully, not error.

### 17.12 Testing Strategy
Unit: task-linking and orphaned-link handling.

### 17.13 Future Extensibility
`linked_entity_type` generic design supports linking to any future module without schema change.

---

## 18. Future Integrations (Scope Placeholder)

Not implemented in MVP. Documented boundary: this module will eventually connect external systems (learning platforms, certification providers, calendars, job boards) as additional evidence/context sources for the Digital Twin and Recommendation Engine. **Implementation boundary for MVP:** no code, no schema — only the extensibility hooks already noted in other modules (`source` enums, `linked_entity_type` fields, event-driven architecture) should anticipate this.

## 19. Future Analytics (Scope Placeholder)

Not implemented in MVP. Documented boundary: this module will eventually provide trend analysis (progress-over-time, readiness-over-time, cohort comparisons) built on top of the append-only snapshot tables already specified in Progress Engine (§9) and Career Readiness Engine (§15). **Implementation boundary for MVP:** no dashboards, no aggregation jobs — only ensure snapshot tables remain append-only so this is additive later.

---

## 20. Cross-Cutting Concerns

### 20.1 Event Catalog (Summary)

| Event | Published By | Consumed By |
|---|---|---|
| `user.registered`, `user.login`, `user.deactivated` | Auth & Identity | (future analytics only) |
| `profile.updated` | User Profile | Career Digital Twin |
| `goal.created`, `goal.changed` | Career Goals | AI Roadmap Engine, Career Digital Twin |
| `roadmap.generated`, `roadmap.node.completed`, `roadmap.regenerated` | AI Roadmap Engine | Learning Progress Tracking, Study Planner, Skill Tracking, Projects |
| `progress.updated` | Learning Progress Tracking | Career Readiness Engine, Career Digital Twin |
| `study_session.logged` | Study Planner | Career Digital Twin, Productivity (optional) |
| `skill.updated` | Skill Tracking | AI Roadmap Engine, Career Readiness Engine, Career Digital Twin |
| `project.submitted` | Projects | Learning Progress Tracking (future) |
| `assessment.scored` | Assessments & Quizzes | Learning Progress Tracking, Skill Tracking, AI Roadmap Engine |
| `interview.completed` (mode=practice\|company) | AI Mock Interview System | Learning Progress Tracking, Career Readiness Engine, Career Digital Twin, Recommendation Engine |
| `readiness.updated` | Career Readiness Engine | Career Digital Twin, Recommendation Engine |
| `recommendation.generated` | Recommendation Engine | Productivity (optional) |

**Rule:** the Digital Twin subscribes to every event above that carries context-relevant state; it is the only cross-cutting subscriber. Business modules subscribe only to events from modules they have a documented dependency on (see each module's §Module Relationships).

### 20.2 Folder Structure (Recommended, Monorepo-Style)

\`\`\`
careeros-ai/
├── apps/
│   └── web/                        # client application
├── services/
│   ├── auth/
│   ├── profile/
│   ├── career-goals/
│   ├── roadmap-engine/
│   ├── progress-engine/
│   ├── study-planner/
│   ├── skill-tracking/
│   ├── projects/
│   ├── assessments/
│   ├── interview/
│   │   ├── practice-mode/
│   │   └── company-mode/
│   ├── career-readiness/
│   ├── recommendation-engine/
│   ├── productivity/
│   └── digital-twin/                # cross-cutting, not a "business" service
├── packages/
│   ├── event-bus-client/            # shared publish/subscribe wrapper
│   ├── ai-reasoning-client/          # shared LLM orchestration client
│   └── shared-types/                 # shared domain types/interfaces
└── docs/
    └── careeros-ai-architecture.md   # this document
\`\`\`

Each service under `services/` owns its own schema/migrations and only accesses other services' data via events or their public API — never direct cross-schema database joins.

### 20.3 API Conventions (Documentation Only)
- REST-style resource-oriented endpoints, versioned under `/api/v1/`.
- All endpoints require a valid session/JWT except `POST /auth/register`, `POST /auth/login`, `POST /auth/reset-password`.
- Mutations that affect Mandatory roadmap structure must return a clear 4xx with a machine-readable reason code (e.g., `MANDATORY_NODE_PROTECTED`), never a silent no-op.

### 20.4 Database Conventions (Documentation Only)
- One logical schema per service (can share a physical database instance for MVP cost reasons, but schemas must remain logically isolated — no cross-schema foreign keys except to `auth.users(id)`).
- Snapshot/evidence tables (Progress, Readiness) are append-only.
- Every table includes `created_at`; mutable tables include `updated_at`.

### 20.5 Security Considerations (System-Wide)
- All service-to-service calls (including to the Digital Twin) must carry the authenticated `user_id` — no service trusts a client-supplied user_id without session validation at the gateway.
- The Company Interview Mode's "no Twin read" rule (§14.2.7) should be enforced with a build-time/lint-level dependency check, not just code review discipline.
- All user-generated free text (project links, interview responses, notes) must be sanitized before storage/render.

### 20.6 Error Handling Strategy (System-Wide)
- Every domain event publish must be retried with idempotency keys — consumers (especially the Digital Twin and Progress Engine) must handle duplicate delivery without double-counting evidence.
- AI Reasoning Engine calls must have a documented fallback (e.g., cached last-good roadmap/questions) if the LLM call fails, rather than surfacing a raw error to the user mid-interview or mid-roadmap-generation.

### 20.7 Testing Strategy (System-Wide)
- Unit tests per service for domain logic (as listed in each module section).
- Contract tests for every published event schema, so a producer can't silently change an event shape a consumer depends on.
- One system-level integration test suite covering the full "goal set → roadmap generated → module completed → assessment scored → progress updated → readiness updated → recommendation generated" happy path end to end.
- A dedicated invariant test asserting Company Interview Mode never calls the Digital Twin context-retrieval interface (§14.2.11).

### 20.8 Scalability Considerations (System-Wide)
- Event bus decoupling means individual services (e.g., AI Mock Interview, which is likely the most compute/LLM-heavy) can scale independently of lighter services (e.g., Productivity).
- The Digital Twin's partitioned context design (§4.4) allows independent caching/invalidation per partition, avoiding full-context recomputation storms as user count grows.

### 20.9 MVP-Wide Implementation Boundaries (Explicit)
Do **not** build in the MVP:
- Push notifications, calendar sync, external integrations (§18)
- Analytics dashboards, trend charts (§19)
- Peer review, AI project evaluation (§12)
- Multi-goal support (schema allows it, application layer restricts to one active goal) (§7)
- AI-graded open-ended assessment questions (§13)
- MFA, institution SSO (§5)

Everything else specified in this document is in scope for the MVP.

---

*End of architecture reference. This document should be updated (versioned) whenever a module's scope, event contract, or Digital-Twin interaction changes — treat it as living documentation co-located with the codebase (\`docs/careeros-ai-architecture.md\`), not a one-time artifact.*
