# AI_ARCHITECTURE.md — CareerOS AI

**Document type:** AI architecture reference — the single source of truth for how AI is built inside CareerOS AI
**Not covered here:** engineering workflow (`CLAUDE.md`), system/module architecture (`CareerOS_Architecture.md`), product rationale (`PRODUCT_CONTEXT.md`)
**Audience:** engineers implementing or extending any AI-powered feature in this product

---

# 1. AI Philosophy

- **AI augments user decisions; it never makes them.** Every AI output (a roadmap, a recommendation, an interview evaluation) is presented to the user as guidance, not as an autonomous decision the platform enforces on their behalf.
- **AI never owns business data.** Business modules (Roadmap, Assessments, Progress, Readiness, etc.) remain the sole owners and systems of record for their own data, exactly as defined in `CareerOS_Architecture.md`. AI generates content and judgments that business logic then persists — AI itself has no database of its own beyond the Career Digital Twin's context store, which is a derived view, not a source of truth.
- **AI is stateless between requests.** No AI provider call carries memory of prior calls implicitly. Anything that looks like "memory" (the Twin, conversation history) is explicitly assembled by CareerOS and passed in on every request.
- **CareerOS owns all persistent data.** Conversation history, generated roadmaps, interview transcripts — all of it is stored and versioned by CareerOS systems, never left to reside only inside a provider's own infrastructure.
- **Every AI response must be grounded in user evidence.** Wherever a business module has relevant evidence about the user (skills, progress, assessments, interview history), that evidence is provided as context — AI is not permitted to fall back on generic, ungrounded output where grounded evidence exists.
- **Deterministic logic is preferred wherever possible.** AI is reserved for genuinely judgment-requiring tasks (see `PRODUCT_CONTEXT.md` §8); everything that can be computed with plain business logic is computed that way, not routed through an LLM for the sake of consistency of style.
- **AI generates intelligence, not business rules.** Mandatory roadmap dependency structure, progression gating, and data-ownership rules are enforced by deterministic business logic. AI proposes *content* within those rules — it never has the authority to override them (e.g., AI cannot mark a Mandatory node completable-without-assessment).

---

# 2. AI System Overview

Every AI-powered feature in CareerOS AI flows through the same conceptual pipeline, regardless of which module initiates it:

\`\`\`
User
 ↓
Application (business module: Roadmap Engine, Mock Interview, Recommendation Engine, Chatbot, etc.)
 ↓
AI Orchestration Layer
 ↓
Context Builder
 ↓
AI Provider Abstraction
 ↓
LLM
 ↓
Response Validator
 ↓
Application
\`\`\`

**Layer responsibilities:**

- **Application.** The owning business module decides *that* an AI call is needed and *why* (e.g., "generate a roadmap," "evaluate this interview response"). It never talks to an LLM directly.
- **AI Orchestration Layer.** The single internal entry point every module uses to request AI-generated output. It decides which task template applies, which context partitions are required, and which provider/model to use for that task. No business module constructs a prompt itself.
- **Context Builder.** Assembles the actual context payload for this specific request — pulling only the context partitions relevant to the task (see §4) from the Career Digital Twin and any task-specific sources (e.g., conversation history for the chatbot).
- **AI Provider Abstraction.** Translates the orchestration layer's task + context into a call against whichever LLM provider is currently configured, and translates the raw response back into a provider-agnostic shape (see §3).
- **LLM.** The underlying model. It is treated as a stateless, swappable computation resource — never a place where persistent product state lives.
- **Response Validator.** Confirms the LLM's output matches the expected structured schema for that task before it's allowed anywhere near business logic (see §6).
- **Application.** The originating module receives validated, structured output and applies its own business rules to it (e.g., tagging roadmap nodes Mandatory/Recommended/Optional, persisting an interview evaluation) exactly as it would with any other computed input.

This pipeline is uniform across all five AI-powered modules listed in §7 — no module is permitted to build a parallel, ad hoc path from "application" straight to "LLM."

---

# 3. AI Provider Abstraction

**Why the system must never directly depend on a specific provider:** LLM providers change pricing, rate limits, capabilities, and availability over time, and different tasks may eventually be best served by different providers (e.g., a cheaper/faster model for chatbot turn-taking vs. a stronger model for roadmap generation). Coupling business logic directly to one provider's SDK or request/response shape would mean every provider change becomes a cross-cutting rewrite touching every AI-powered module.

**Design:** every module calls the AI Orchestration Layer with a provider-agnostic task request (task type + context + expected output schema). The Provider Abstraction layer is solely responsible for:
- Translating that request into the current provider's actual API call shape.
- Translating that provider's raw response back into the provider-agnostic response shape the Response Validator expects.
- Selecting which configured provider/model serves a given task type, based on configuration external to business logic.

**Primary Provider (current MVP):** Google Gemini.

**Future Providers (architecturally anticipated, not implemented in MVP):** OpenAI, Anthropic, Groq, OpenRouter.

**How providers can be swapped without affecting business logic:** because no business module ever imports a provider SDK or constructs a provider-specific request, swapping — or running multiple providers simultaneously for different task types — is entirely a change inside the Provider Abstraction layer and its configuration. Business modules, the Context Builder, and the Response Validator are provider-agnostic by construction and require no changes when a provider is added, removed, or reassigned to a different task.

---

# 4. AI Context Engineering

This is the most important section in this document. **Context quality determines output quality far more than prompt wording or length.** A well-engineered prompt against incomplete or irrelevant context will still produce generic, ungrounded output; a simple prompt against precisely the right context will produce output that feels genuinely personalized.

**Context sources, assembled per-task from the Career Digital Twin and task-specific stores:**
- User Profile
- Career Goals
- Roadmap (current structure and state)
- Learning Progress
- Projects
- Assessments
- Mock Interview History
- Career Digital Twin (aggregated cross-cutting view — see §8)
- Recommendations (active/prior)
- Conversation Context (chatbot only — the current dialogue's own history)

**Core rule: assemble only what the task needs.** The Context Builder retrieves context *per task type*, not as one universal "everything about the user" blob:
- Roadmap generation needs Profile, Career Goals, Skill state, and Evidence state — it does not need Conversation Context or Recommendation history.
- Practice Mode interview question generation needs Skill state, Evidence state, and Learning state — it does not need raw Project submission text.
- The Chatbot is the one task type that may draw on the widest range of context partitions, but even there, context is assembled based on **intent detection** (§10) for the specific turn, not indiscriminately loaded in full every message.

**Why context engineering matters more than prompt length:** a longer prompt stuffed with irrelevant context doesn't just cost more tokens — it actively degrades output quality by diluting the signal the model needs to ground its response, and it increases the surface area for the model to latch onto something irrelevant. The discipline that matters is *precision* — including exactly the evidence relevant to this task and nothing else — not volume.

**Context freshness:** because the Career Digital Twin is continuously updated by business-module events (per `CareerOS_Architecture.md` §4), the Context Builder always retrieves current state at request time rather than relying on any cached context from a prior AI call.

---

# 5. Prompt Engineering Strategy

Every AI request in CareerOS AI is conceptually structured from the same five components, regardless of which module or task type initiates it:

\`\`\`
System Context   — the AI's role and behavioral constraints for this task type
Application Context — which module/feature this is, and its specific business rules
User Context     — the assembled context from §4, scoped to this task
Task             — the specific thing being asked of the model this call
Constraints      — hard boundaries the output must respect (e.g., "never mark a Mandatory node removable")
Expected Output Format — the structured schema the response must conform to (see §6)
\`\`\`

**Why every module follows the same structure:** a standardized prompt architecture means:
- Any engineer can read or modify a prompt for any module and immediately understand which part is fixed (System/Application Context, Constraints, Output Format) versus which part varies per request (User Context, Task).
- Constraints that matter product-wide (e.g., "AI never invents business rules," "Mandatory content is never removable") can be maintained in one shared System Context template rather than being re-derived, inconsistently, inside each module's own prompt.
- Response Validator logic can rely on a consistent expected-output convention across all modules, rather than parsing five different ad hoc response shapes.

This uniformity is what prevents the AI layer from accumulating five different implementation styles as the product grows — a new AI-powered module should be a new instance of this same five-part structure, not a novel prompting approach.

---

# 6. Structured Output Strategy

**AI responses are never consumed directly by business logic or the frontend.** Free-form LLM text is inherently unreliable as a direct input to anything that persists data, displays UI, or gates progression — it must always pass through structure and validation first.

\`\`\`
LLM
 ↓
Structured JSON
 ↓
Validation
 ↓
Business Logic
 ↓
Database
 ↓
Frontend
\`\`\`

- **LLM → Structured JSON.** Every AI task type has a defined output schema (e.g., a roadmap-generation response is a nested module/topic/subtopic/checklist structure with type tags; an interview evaluation response is a structured feedback object). The model is instructed to produce exactly that shape.
- **Validation.** The Response Validator checks the returned structure against the task's schema before anything downstream touches it — required fields present, enums within allowed values (e.g., node type is one of mandatory/recommended/optional), no unexpected structural drift.
- **Business Logic.** Only validated output reaches the owning module's business logic, which then applies its own rules exactly as it would to any other input (e.g., the Roadmap Engine still enforces that Mandatory nodes can't later be marked removable, independent of what the AI proposed).
- **Database / Frontend.** Persistence and display only ever happen on validated, business-logic-processed output — never on raw model output.

**Validation philosophy:** validation is strict and schema-first, not "best effort" text parsing. A response that doesn't conform is treated as a failed AI call, not as a degraded-but-usable one.

**Recovery strategy if output is invalid:** a validation failure triggers the same retry/fallback path described in §12 (a single bounded retry with a stricter reiteration of the expected format, then fallback behavior specific to the task) — it never triggers an attempt to "salvage" a partially malformed response by passing fragments of it into business logic.

---

# 7. AI Module Architectures

## 7.1 AI Roadmap Engine

**Purpose:** Generate and periodically recalibrate a personalized learning roadmap.

**Inputs:** Career Goal, User Profile, existing Skill state, Learning History, Assessment results.

**Context Required:** Profile, Career Goals, Skill state, Evidence state (from the Twin).

**AI Responsibilities:** Propose roadmap structure (modules → topics → subtopics → checklist items) and propose Mandatory/Recommended/Optional tagging for each node, grounded in the user's actual background and target role.

**Expected Outputs:** A structured roadmap tree conforming to the domain model defined in `CareerOS_Architecture.md` §8.6.

**Validation Strategy:** Schema validation of the tree structure; additionally, a business-logic pass confirms the dependency graph is well-formed (no orphaned prerequisite links) before the roadmap is considered generated.

**Persistence Strategy:** The Roadmap Engine (business logic), not the AI layer, persists the validated roadmap and owns all subsequent mutation of it.

**Interaction with other modules:** Reads Twin context at generation and recalibration time; writes trigger downstream events (`roadmap.generated`, `roadmap.regenerated`) exactly as specified in the system architecture.

**Failure Handling:** If generation fails validation after retry, the prior roadmap version (if one exists) remains active rather than leaving the user without a roadmap; a first-time generation failure surfaces a clear "unable to generate roadmap, please retry" state rather than a partial/broken roadmap.

**Future Extensibility:** Multi-path branching roadmap generation.

## 7.2 Career Digital Twin

Treated in full in §8 — its AI-facing role is as the shared context source every other AI module reads from, not as a module that itself makes AI generation calls.

## 7.3 AI Recommendation Engine

**Purpose:** Generate a small, prioritized set of next-action recommendations.

**Inputs:** Latest Career Readiness output, full relevant Twin context.

**Context Required:** Readiness state, Evidence state, Skill state, active/prior Recommendations (for dedupe).

**AI Responsibilities:** Identify the highest-value next actions given current gaps, and articulate why each is being recommended.

**Expected Outputs:** A structured, prioritized list of recommendation objects (type, description, priority, source reasoning).

**Validation Strategy:** Schema validation; a dedupe pass against currently active, non-dismissed recommendations before anything is persisted (per `CareerOS_Architecture.md` §16.11).

**Persistence Strategy:** The Recommendation Engine business logic persists validated recommendations; the AI layer never writes directly to the recommendations table.

**Interaction with other modules:** Triggered by `readiness.updated` and `interview.completed` events; consumed by the Dashboard and surfaced by the Chatbot.

**Failure Handling:** A failed generation attempt simply results in no new recommendations this cycle — it never falls back to fabricated or generic recommendations disconnected from evidence.

**Future Extensibility:** Recommending specific external resources once Future Integrations exist.

## 7.4 Mock Interview

**Purpose:** Two distinct AI-driven interview experiences — coaching (Practice Mode) and realistic simulation (Company Mode).

**Inputs:**
- Practice Mode: full Twin context (skills, progress, weak areas, prior interviews).
- Company Mode: company, job role, experience level, interview round only.

**Context Required:**
- Practice Mode: Skill state, Evidence state, Learning state.
- Company Mode: **none from the Twin** — this is an explicit architectural exception, not an oversight (see §7.4 note below and `CareerOS_Architecture.md` §14.2.7).

**AI Responsibilities:** Generate questions, (Practice Mode only) adapt difficulty and follow-ups in real time, evaluate responses, and generate final feedback.

**Expected Outputs:** Structured question objects, structured per-response evaluations, and a structured final feedback/evaluation object.

**Validation Strategy:** Schema validation per turn (question generation, response evaluation) and for the final feedback object; Company Mode additionally has an enforced code-path check confirming no Twin context call occurred during the session (see `CLAUDE.md` §12).

**Persistence Strategy:** Interview session, question, response, and feedback records are persisted by the Mock Interview business logic; Twin write-back happens only after session completion, for both modes.

**Interaction with other modules:** Practice Mode reads the Twin at session start; both modes publish `interview.completed` events consumed by Learning Progress Tracking, Career Readiness Engine, the Twin, and the Recommendation Engine.

**Failure Handling:** A failed question-generation call mid-session falls back to a bounded retry, then to a pre-validated question from that task's fallback pool rather than stalling the interview session; a failed evaluation call is retried before ever surfacing an interview session as "complete" without feedback.

**Future Extensibility:** Additional interview formats (panel, behavioral-only, voice — see §14).

## 7.5 Personalized AI Career Chatbot

Treated in full in §9.

---

# 8. Career Digital Twin as AI Memory

The Career Digital Twin should not be thought of as "a database the chatbot happens to query." It is the mechanism that makes every AI module in CareerOS AI behave as though it has continuous memory of the user, despite every individual AI call being stateless.

**Evidence aggregation.** The Twin continuously absorbs evidence from every business module (assessment scores, interview outcomes, roadmap completions) into a structured, AI-consumable form, so that no AI module has to independently reconstruct "what does this user actually know" from raw business records on every call.

**User evolution.** Because the Twin updates on every relevant event rather than only at fixed intervals, it always reflects who the user is *now* — a user's weak areas, pace, and readiness shift over time, and the Twin is what lets every AI module stay current with that shift without extra engineering effort per module.

**Long-term memory.** In the absence of the Twin, "memory" would have to mean something different and weaker in each module — the chatbot might remember only the current conversation, the interview module might remember only recent sessions. The Twin is what unifies all of this into one coherent, long-term picture that persists across the user's entire relationship with the product, not just a single session or feature.

**Personalization source.** Every AI module's context (§4) is, in practice, largely a scoped slice of the Twin. The Twin is the single place personalization signal accumulates; individual modules do not maintain their own parallel notion of "what this user is like."

**Context provider.** Practically, the Twin exposes a context-retrieval interface that returns only the partitions relevant to a given request (per `CareerOS_Architecture.md` §4.5) — this is what lets the Context Builder (§4) stay precise rather than defaulting to "send everything."

**How every AI module consumes it:** the AI Roadmap Engine, Practice Mode interviews, the Recommendation Engine, and the Chatbot all retrieve Twin context at the point they need it — each requesting only the partitions relevant to their task. Company Mode interviews are the sole architectural exception, by design, to preserve realistic simulation (§7.4).

---

# 9. Personalized AI Career Chatbot Architecture

**How it differs from a generic chatbot:** a generic chatbot's context is whatever the user types into that conversation. This chatbot's context is the user's entire CareerOS history — roadmap, progress, assessments, interviews, recommendations — retrieved fresh at the start of relevant reasoning, on top of the conversation itself. It is architecturally a Twin-grounded reasoning system with a conversational interface, not a conversational interface with optional data lookups bolted on.

**How it retrieves user context:** on each user turn, intent detection (§10) determines which Twin context partitions and which other data (e.g., a specific past interview, a specific roadmap topic) are relevant to what the user is actually asking, and the Context Builder assembles exactly that scoped context — not the user's entire history on every single message.

**How conversation memory works:** the current conversation's own turn history is treated as its own context source (Conversation Context, §4), assembled alongside — not instead of — the user's broader CareerOS history. A chatbot session should feel continuous both within itself (it remembers what was just said) and across sessions (it remembers who the user is), because both context sources are always available to be drawn on.

**How it should answer questions across topics:**
- **Career** questions ground in Career Goals and Readiness state.
- **Learning** questions ground in Roadmap and Learning Progress state.
- **Projects** questions ground in Project submission records.
- **Assessments** questions ground in Assessment/quiz history and results.
- **Roadmap** questions ground in the current roadmap structure and the user's position in it.
- **Interview** questions ground in Mock Interview History (both modes, distinguished appropriately).
- **Recommendation** questions ground in the Recommendation Engine's active output and its stated reasoning.
- **Progress** questions ground in Learning Progress and Readiness state together.
- **Motivation** turns still ground in real, specific progress evidence — encouragement should reference something true and specific about the user's actual trajectory, not generic sentiment.

**Grounding before general knowledge:** for any question that touches the user's own situation, the chatbot must resolve the answer from internal, retrieved CareerOS data first. General LLM world knowledge is used only to explain a concept, term, or general career-advice topic that has no user-specific data associated with it — and even then, the response should connect that general explanation back to the user's specific context wherever relevant (e.g., explaining a topic, then relating it to where it sits in the user's own roadmap).

---

# 10. AI Request Lifecycle

\`\`\`
User Request
 ↓
Intent Detection
 ↓
Context Assembly
 ↓
Prompt Construction
 ↓
Provider Selection
 ↓
LLM
 ↓
Output Validation
 ↓
Business Logic
 ↓
Persistence (if required)
 ↓
Frontend Response
\`\`\`

- **User Request.** The originating action — a roadmap-generation trigger, an interview turn, a chatbot message, a recommendation cycle.
- **Intent Detection.** Determines the specific task type (and, for the chatbot, which conversational intent the message represents) so that context assembly and prompt construction can be scoped precisely rather than generically.
- **Context Assembly.** The Context Builder retrieves exactly the context partitions relevant to this task/intent (§4).
- **Prompt Construction.** The five-part prompt structure (§5) is assembled from that context plus the task-specific System/Application Context, Constraints, and Output Format.
- **Provider Selection.** The Provider Abstraction layer resolves which configured provider/model serves this task type (§3).
- **LLM.** The model call itself — stateless, given everything it needs in this single request.
- **Output Validation.** The Response Validator checks the returned structure against the task's schema (§6) before anything proceeds.
- **Business Logic.** The owning module applies its own deterministic rules to the validated output (e.g., dependency-graph checks, dedupe, progression gating).
- **Persistence (if required).** The owning module persists the result according to its own data-ownership rules — the AI layer itself never persists directly.
- **Frontend Response.** The user receives the result of business logic having processed validated AI output — never raw model output.

Every stage in this lifecycle applies uniformly across all five AI-powered modules; no module skips a stage or substitutes a shortcut path.

---

# 11. AI Cost Optimization

- **Call AI only when needed.** Deterministic modules (§ per `PRODUCT_CONTEXT.md` §8) never route through this pipeline at all; even within AI-powered modules, routine confirmations or unchanged states should not trigger a fresh generation.
- **Cache expensive generations.** A generated roadmap, once produced, is stored and reused — it is not regenerated on every view, only on the specific triggers that warrant recalibration (goal change, explicit request).
- **Store roadmaps (and other generated artifacts) rather than regenerating them.** Persistence of AI output, per §6/§7, is itself a cost-optimization mechanism, not only a data-integrity one.
- **Reuse summaries.** Where a task needs a digest of a large evidence history (e.g., full interview history), prefer maintaining an incrementally updated summary in the Twin over re-summarizing raw history on every request.
- **Avoid duplicate requests.** Recommendation dedupe (§7.3) is one instance of a broader principle — check whether a fresh AI call is actually needed before making one, given what's already been generated and still valid.
- **Compress context.** Context assembly (§4) should favor the Twin's already-aggregated, structured state over passing raw historical records — the aggregation itself is a compression step that keeps prompts smaller without losing grounding.
- **Prefer deterministic logic where possible.** Reiterated from §1 because it is as much a cost lever as a design principle — every task correctly kept deterministic is a task that never incurs LLM cost at all.
- **Batch requests when appropriate.** Where multiple independent pieces of structured output are needed for the same context (e.g., generating several roadmap modules at once), prefer a single batched generation call over multiple sequential calls re-sending the same context.

---

# 12. AI Reliability

- **Hallucination reduction.** Enforced primarily through context grounding (§4) and structured output constraints (§6) — the model is given the specific evidence it needs and a narrow schema to fill, rather than being asked to freely recall or infer facts about the user it wasn't given.
- **Output validation.** Every response passes through the Response Validator (§6) before use; nothing partially-validated is treated as usable.
- **Retry strategy.** A single bounded retry with a stricter restatement of the expected output format is attempted on validation failure before falling back — retries are not unbounded, to avoid runaway cost/latency on a persistently malformed response.
- **Fallback provider.** The Provider Abstraction (§3) allows a secondary provider/model to be configured per task type, so a primary-provider outage or persistent failure can fail over rather than surfacing an error to the user for a task that has a reasonable fallback path.
- **Timeout handling.** Every AI call has a bounded timeout appropriate to its task's interactivity requirements (e.g., a chatbot turn has a tighter timeout expectation than a full roadmap generation); a timeout is treated the same as a failed call for retry/fallback purposes.
- **Rate limiting.** Provider-level rate limits are respected centrally in the Provider Abstraction layer, not handled inconsistently by each calling module.
- **Prompt versioning.** The System Context / Constraints / Output Format templates (§5) for each task type are versioned, so a prompt change can be tied to a specific, reviewable revision rather than being an untracked in-place edit.
- **Explainability.** Structured outputs that involve a judgment (readiness breakdowns, recommendation reasoning, interview feedback) include the reasoning as a first-class structured field, not just a bare score/verdict — so the business logic and the user both have access to *why*, not only *what*.
- **Confidence awareness.** Where a task's context is sparse (e.g., a user with almost no evidence yet attempting a readiness computation), the AI Roadmap/Readiness-adjacent tasks should reflect that sparsity in their output (e.g., flagging low-confidence areas) rather than presenting a falsely confident result — consistent with the sparse-evidence handling already specified in `CareerOS_Architecture.md` §15.11.

---

# 13. AI Security & Privacy

- **PII protection.** Context assembled for any AI call includes only what's necessary for the task (§4) — free-text fields with potential PII (e.g., project submission notes) are included only when the task genuinely requires them, not by default.
- **Prompt safety.** System Context and Constraints (§5) are the enforcement point for behavioral boundaries (e.g., refusing to fabricate business rules, respecting Mandatory-content protection) — these are treated as fixed, reviewed template content, not something a user's input can override.
- **Data isolation.** Context assembly is always scoped to a single authenticated user's own data — no AI request ever assembles or mixes context across users.
- **Secure provider communication.** All calls to the configured LLM provider occur over encrypted transport, with provider credentials held centrally in the Provider Abstraction layer rather than distributed across individual business modules.
- **Prompt injection awareness.** User-supplied free text that becomes part of a prompt (chatbot messages, interview responses, project descriptions) is treated as untrusted input — it is included as *data* within the User Context/Task sections of the prompt structure (§5), never concatenated in a way that could be mistaken for System Context or Constraints instructions.
- **Least privilege.** The AI Orchestration Layer and Provider Abstraction have access only to the context a given task type declares it needs — there is no ambient "give the AI layer full database access" pattern; each task's context is explicitly assembled and scoped.
- **User data ownership.** Consistent with `PRODUCT_CONTEXT.md` §2 — AI-generated content becomes part of the user's own persisted history once validated and stored; it is not retained or reused by the provider layer beyond the scope of serving that single request.

---

# 14. Future AI Expansion

The following are explicitly outside the current MVP and are noted here only so today's architecture doesn't foreclose them:

- **Voice Interviews** — extending Mock Interview with spoken input/output.
- **Agentic Planning** — a Roadmap Engine that can take multi-step autonomous action rather than producing a single generation per trigger.
- **Autonomous Career Coach** — a chatbot capable of proactively initiating guidance rather than only responding to user-initiated turns.
- **Resume AI** — AI-assisted resume generation, once a Resume Builder module exists (per `PRODUCT_CONTEXT.md` §11).
- **Portfolio AI** — similarly contingent on a future Portfolio Builder module.
- **Job Tracker AI** — AI assistance layered on a future Job Tracker module.
- **Multi-agent workflows** — decomposing a single task (e.g., roadmap generation) across multiple specialized model calls coordinating with each other, rather than one orchestrated call per task.

None of these should influence current implementation beyond ensuring the layered architecture in §2 and the provider abstraction in §3 don't structurally prevent them later.

---

# 15. AI Design Decisions

| Decision | Reason | Impact |
|---|---|---|
| **The Career Digital Twin is the single personalization source for every AI module.** | Prevents each AI-powered module from independently reconstructing "who is this user" and risking inconsistent or stale pictures of the same person. | Personalization is consistent across the Roadmap Engine, Recommendation Engine, Practice Mode interviews, and Chatbot. |
| **AI never directly writes business data.** | Business modules must retain their documented data-ownership and validation guarantees regardless of what an AI call proposes. | AI output is always mediated by the same business rules (e.g., Mandatory-node protection) that apply to any other input. |
| **All providers use the same abstraction layer.** | Avoids coupling business logic to a single vendor's API shape, and allows per-task provider/model choice as the platform matures. | Provider changes or additions require changes only inside the Provider Abstraction layer, never inside business modules. |
| **Every AI module returns structured data, validated before use.** | Free-form model output is not safe to persist, display, or gate business logic on directly. | Predictable, schema-conformant behavior across all five AI-powered modules; a clear, bounded failure mode when output doesn't conform. |
| **AI should enrich, never replace, deterministic logic.** | Deterministic logic is cheaper, faster, and more explainable wherever genuine judgment isn't required. | AI cost and latency are reserved for the parts of the product where they're actually earning their value; the rest of the system remains fast and predictable. |
| **Company Interview Mode is the sole module with no Twin-context read during its core task.** | Realistic interview simulation requires the system not to quietly adapt to known weaknesses mid-session. | This mode is architecturally distinct from every other AI-powered module and must be preserved as an explicit exception, not gradually merged into the general context-retrieval pattern. |
