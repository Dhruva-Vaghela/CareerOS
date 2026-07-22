# CLAUDE.md — CareerOS AI Engineering Operating Manual

**Type:** AI Coding Agent Operating Manual (not a project documentation file)
**Applies to:** Claude Code, Antigravity, and any AI coding agent working in this repository
**Source of truth:** `docs/careeros-ai-architecture.md`

---

## 1. Purpose

This file exists to tell an AI coding agent **how to work** in this repository — not what the product is. The architecture document (`docs/careeros-ai-architecture.md`) is the single source of truth for *what* CareerOS AI is and *how it is designed*. This file governs *behavior*: reading order, engineering discipline, token usage, and the boundaries an agent must never cross.

**How Claude Code should use this file:**
- Read it in full before touching any code, on every new session.
- Treat every rule here as binding unless a human explicitly overrides it in the current conversation.
- When this file and general training habits conflict, this file wins.

**Relationship to other documentation:**

| Document | Role |
|---|---|
| `docs/careeros-ai-architecture.md` | Architecture source of truth — module design, data flow, event contracts |
| `CLAUDE.md` (this file) | Operating manual — how to behave while implementing that architecture |
| `PROJECT_CONTEXT.md` (if present) | Current build status, active priorities |
| `IMPLEMENTATION_ORDER.md` (if present) | Sequencing of module implementation |
| Per-module docs (if present) | Deep detail on a single module, supplementing the architecture doc |

This file does not restate the architecture. If you need module details, go read the architecture document — do not rely on memory of it from a prior session.

---

## 2. Repository Reading Order

Before writing or modifying any code, read in this exact order. Stop as soon as you have what you need for the task — do not read further documents "just in case."

1. **`docs/careeros-ai-architecture.md`** — always, every session. This is non-negotiable.
2. **`PROJECT_CONTEXT.md`** (if it exists) — current status, what's already built, what's in flight.
3. **`IMPLEMENTATION_ORDER.md`** (if it exists) — confirms this task is sequenced correctly relative to its dependencies.
4. **The specific module's documentation section** relevant to the current task (e.g., only §14 Mock Interview System if working on interviews — not the whole document re-read line by line if you already loaded it this session).
5. **Only then** begin implementation.

**Rule:** Never scan the entire repository "to understand context" before starting a task. Identify the specific module(s) the task touches from the architecture document's dependency tables, and read only those files/folders.

---

## 3. Engineering Principles

| Principle | What it means here |
|---|---|
| **Documentation First** | The architecture document is written and current before implementation starts. If it's silent on something, that's a stop condition (see §10), not a gap to fill in with judgment. |
| **Architecture First** | Module boundaries, event contracts, and the Digital Twin's role are fixed. Code conforms to them; they do not bend to whatever is easiest to implement. |
| **MVP First** | Build only what §20.9 of the architecture document lists as in-scope. Future-scope items are not "nice extras to add while you're in there." |
| **Security First** | Auth, data ownership, and sanitization rules in the architecture document are implemented exactly, not approximated. |
| **Clean Architecture** | Business logic stays independent of framework/transport details; a service's core logic should not know or care whether it's called over REST, an event, or a test harness. |
| **Domain-Driven Design** | Each service owns one bounded context (one module from the architecture document) and its own schema. Language in code matches the domain vocabulary already used in the architecture document (e.g., "Readiness Snapshot," not "score record"). |
| **SOLID** | Especially Single Responsibility and Dependency Inversion — a module's implementation should depend on interfaces (e.g., the Twin's context-retrieval interface), not on other modules' internals. |
| **High Cohesion** | Code that changes together for the same business reason lives together, inside its owning module/service. |
| **Loose Coupling** | Cross-module communication happens only via the event bus or documented public APIs — never direct imports across service boundaries, never direct cross-schema database queries. |
| **Single Responsibility** | One file/class/function does one job. If a change touches two unrelated responsibilities, split it. |
| **Event-Driven Communication** | Personalization and cross-module updates flow through the event catalog (architecture doc §20.1). Synchronous cross-module calls are reserved for strict integrity operations only. |
| **Production-Ready Code** | No placeholder logic, no `TODO` left in place of a documented requirement, no silent fallback that isn't specified in the architecture document's edge-case handling. |
| **Reuse Existing Components** | Before writing new logic, check `packages/` (shared clients/types) and sibling services for existing equivalents. |
| **Avoid Technical Debt** | Do not take shortcuts that violate the architecture to hit a deadline; flag the tension instead (see §10). |

---

## 4. Architecture Preservation Rules

Claude must **never redesign architecture** unless a human explicitly instructs it to in the current session. The following are treated as fixed constraints, not defaults to reconsider:

- **Career Digital Twin philosophy** — it never owns business data; it is a read-optimized, event-driven context aggregator only. Do not add business-data writes to it.
- **AI Roadmap philosophy** — roadmaps are generated, not predefined; Mandatory nodes are structurally unremovable; personalization applies only to Recommended/Optional nodes.
- **Progress Engine** — progress is always multi-signal (checklist + quiz + assessment + interview evidence), never single-signal.
- **Recommendation Engine** — reads Twin context and Readiness output only; does not gain new upstream dependencies without instruction.
- **Mock Interview workflows** — Practice Mode reads full Twin context at session start and writes back at the end; **Company Mode never reads Twin context, at any point during the interview.** This distinction must never be "simplified away" by sharing a code path.
- **Event-driven architecture** — the event catalog in the architecture document (§20.1) is the contract. Do not introduce new synchronous cross-module calls to replace an existing event, and do not invent new event names without updating the architecture document first (§7).
- **Module boundaries** — as defined in the architecture document's module list. Do not merge modules, split modules, or move responsibilities between them without explicit instruction.
- **Data ownership** — each module's "sole owner of X records" statement in the architecture document is absolute. No other module writes to another module's tables, directly or via a shared ORM model.
- **Business workflows** — lifecycles (e.g., roadmap generation, interview sessions, readiness computation) proceed exactly as sequenced in the architecture document's workflow/sequence sections.

**Whenever uncertainty exists about whether something is an architecture decision or an implementation detail: prefer re-reading the architecture document over making an assumption.**

---

## 5. Coding Standards

These are intentionally language/framework-agnostic; adapt syntax to whatever stack the repository already uses, but do not deviate from the structure.

| Area | Rule |
|---|---|
| **Folder organization** | Follow the structure in architecture doc §20.2 — one folder per service under `services/`, shared code under `packages/`. Do not create ad hoc top-level folders. |
| **Naming conventions** | Use the domain vocabulary from the architecture document verbatim (e.g., `ChecklistItem`, `ReadinessSnapshot`) — do not rename entities to something that "reads better" in code. |
| **File organization** | One primary concern per file (one entity, one service class, one route group). Avoid god-files that mix domain logic, transport, and persistence. |
| **Component organization** | UI components (if applicable) mirror module boundaries — a component consuming Recommendation Engine data should not also directly query Progress Engine data; go through the module's own API. |
| **Service organization** | Each service exposes a clear public interface (API + published events) and keeps everything else private/internal. |
| **Shared utilities** | Only genuinely cross-cutting code (event-bus client, AI-reasoning client, shared types) goes in `packages/`. Module-specific helpers stay inside that module. |
| **Constants** | No magic strings for event names, node types (Mandatory/Recommended/Optional), or interview modes — centralize as shared constants/enums. |
| **Types / Interfaces** | Domain types match the architecture document's domain models exactly (field names, not just meaning). |
| **Validation** | Validate at the boundary (API input) using the domain model's stated constraints (e.g., dependency-graph protection for Mandatory nodes, per architecture doc §8.12). |
| **Configuration** | Environment-specific values (DB connection, LLM API keys) via environment variables, never hardcoded. |
| **Environment variables** | Document every new environment variable's purpose at the point it's introduced. |
| **Dependency management** | Prefer existing dependencies already used elsewhere in the repo before adding a new library for the same purpose. |
| **Error handling** | Follow architecture doc §20.6 — idempotent event handling, documented fallbacks for AI-call failures, machine-readable reason codes for rejected mutations (e.g., `MANDATORY_NODE_PROTECTED`). |
| **Logging** | Log domain events and their outcomes (not raw user response content) at service boundaries for traceability. |
| **Comments** | Explain *why*, not *what* — especially for anything that looks like it could be "simplified" but exists to preserve an architecture constraint (e.g., "Company Mode intentionally has no Twin import — see CLAUDE.md §4"). |
| **Documentation** | Update relevant documentation in the same change set as any behavior change (see §13). |
| **Testing** | Per architecture doc §20.7 — see §12 of this file. |

---

## 6. AI Implementation Workflow

For every implementation task, follow these steps in order. Do not skip ahead to Step 6.

| Step | Action |
|---|---|
| 1 | **Understand business purpose** — what problem does this task solve, per the architecture document's "Purpose & Business Problem" for the relevant module? |
| 2 | **Read relevant documentation** — the specific module section(s) touched, per the Reading Order in §2. |
| 3 | **Understand dependencies** — check the module's "Module Relationships" table (depends on / depended on by) before writing code. |
| 4 | **Identify reusable components** — check `packages/` and sibling modules for existing equivalents before building new. |
| 5 | **Design implementation** — sketch the approach against the architecture (data model, event flow) before writing code; if the design requires deviating from the architecture document, stop and flag it (§10) rather than proceeding. |
| 6 | **Implement** — write the code, matching Coding Standards (§5). |
| 7 | **Test** — per Testing Policy (§12); do not consider a task done without this step. |
| 8 | **Update documentation if required** — per Documentation Update Policy (§13). |

**Never skip understanding (Steps 1–4) before coding (Step 6).**

---

## 7. Documentation Rules

Claude must:

- [ ] Never contradict the architecture document.
- [ ] Never ignore an architecture constraint because it's inconvenient for the current task.
- [ ] Never silently change business logic — any behavior change must be traceable to an explicit instruction.
- [ ] Never delete documentation, including this file or the architecture document, without explicit instruction.

**Whenever architecture changes are explicitly requested:** update the architecture document first, then implement against the updated document — never implement first and "document later."

---

## 8. AI Token Optimization

- Read only the documentation required for the current task — do not re-read the full architecture document if you already have the relevant section loaded this session.
- Never scan unrelated modules "for context" — use the dependency tables in the architecture document to know exactly which modules matter.
- Reuse context already established earlier in the session instead of re-deriving it.
- Avoid duplicate reasoning — if a design question was already resolved earlier in the session (e.g., "how does Mandatory-node protection work"), reference that resolution rather than re-reasoning from scratch.
- Avoid rebuilding existing modules — extend, don't regenerate, unless explicitly asked to rewrite.
- Prefer extending existing implementations over introducing a parallel implementation of the same responsibility.
- Never regenerate code that already satisfies the requirement unchanged.
- Keep reasoning localized to the module(s) the task actually touches.
- Avoid reading files unrelated to the current task, even if they're nearby in the folder structure.

---

## 9. Module Development Rules

For every module touched:

- [ ] Understand its stated responsibility (architecture doc, "Purpose & Business Problem").
- [ ] Respect its data ownership — do not write to another module's tables.
- [ ] Do not duplicate logic that already exists in the owning module.
- [ ] Communicate cross-module only through the defined interface (API or event).
- [ ] Respect event boundaries — publish/subscribe only to events the module is documented to use (architecture doc §20.1).
- [ ] Maintain loose coupling — no direct imports of another service's internals.
- [ ] Maintain high cohesion — keep the module's own concerns together.
- [ ] Document any assumption made during implementation, however small, in the relevant doc or a code comment referencing this file.

---

## 10. AI Coding Rules

Claude must:

- Never implement undocumented business rules.
- Never invent APIs beyond what the architecture document specifies or clearly implies.
- Never invent database schema beyond the documented domain models.
- Never invent workflows not described in the architecture document.

**If documentation is incomplete for the task at hand:**

1. Stop.
2. Clearly identify the specific missing information (not just "unclear," but exactly what decision is unresolved).
3. Request clarification instead of making an assumption.

This applies even under time pressure or when an assumption "seems obviously right" — the cost of a wrong assumption compounds across modules that depend on it.

---

## 11. Refactoring Policy

Refactor only when the change demonstrably improves one of:

- [ ] Architecture alignment (brings code closer to the documented design)
- [ ] Readability
- [ ] Maintainability
- [ ] Performance
- [ ] Security

**Never refactor merely for stylistic preference.** If a refactor is proposed, state which of the above five it serves before making the change.

---

## 12. Testing Policy

Every implementation should include, as applicable:

| Test type | Requirement |
|---|---|
| Unit Tests | Cover domain logic in isolation (per each module's "Testing Strategy" in the architecture document) |
| Integration Tests | Cover cross-module flows via events (e.g., the full goal → roadmap → progress → readiness → recommendation chain, architecture doc §20.7) |
| Edge Cases | Cover the specific edge cases enumerated per module in the architecture document — not a generic list |
| Error Cases | Cover documented failure/fallback behavior (§20.6 of the architecture document) |
| Regression Tests | Added when a bug is fixed, to prevent recurrence |
| Architecture Invariant Tests | Cover hard constraints — e.g., "Company Interview Mode never calls the Digital Twin context-retrieval interface" (architecture doc §14.2.11) — these are not optional |

Document testing expectations for any new module or significant feature in that module's own section or a linked test-plan note.

---

## 13. Documentation Update Policy

Whenever an implementation changes something documented:

1. Determine whether the architecture document or this file is affected.
2. If yes: update documentation **first**.
3. Then implement against the updated documentation.

**Never allow documentation to drift from what's actually implemented.** A pull request that changes behavior without a corresponding documentation update is incomplete.

---

## 14. Commit Philosophy

- Every implementation change represents **one logical change**.
- Avoid bundling unrelated modifications into the same commit.
- Keep commits focused enough that the architecture document section they relate to is identifiable from the commit alone.
- Preserve repository history — do not squash/rewrite history to hide exploratory steps unless explicitly asked.

---

## 15. AI Collaboration Rules

Multiple AI coding sessions may work on this repository over time. Assume you are not the only session that has touched or will touch this code.

- Maintain consistency with prior sessions' documented decisions.
- Avoid conflicting implementations of the same responsibility.
- Never overwrite another module's code without first understanding what it does and why (§6, Steps 1–4).
- Always preserve architecture, even across sessions with different immediate goals.

---

## 16. Success Criteria

A task is complete only when **all** of the following hold:

- [ ] Business requirement is satisfied, per the architecture document.
- [ ] Architecture remains intact — no unauthorized redesign occurred.
- [ ] Documentation remains consistent with implementation.
- [ ] Required tests (per §12) are written and passing.
- [ ] No duplicated logic was introduced.
- [ ] Security requirements (architecture doc §20.5) are maintained.
- [ ] Implementation is production-ready — no placeholders, no undocumented shortcuts.

If any item is unmet, the task is not done — return to the relevant step in §6 rather than declaring completion.
