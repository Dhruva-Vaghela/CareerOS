# PRODUCT_CONTEXT.md — CareerOS AI Product Reference

**Document type:** Product specification (business logic, feature responsibilities, module interactions, user experience)
**Not covered here:** software architecture (see `CareerOS_Architecture.md`), engineering workflow (see `CLAUDE.md`), implementation or API detail
**Audience:** product stakeholders, future developers, and AI coding assistants who need to understand *what the product is and why* before touching *how it's built*

---

# 1. Executive Summary

CareerOS AI is an AI-powered Career Operating System. It exists to manage a user's entire professional development journey — from first defining a career goal through continuous, evidence-based improvement toward that goal — using intelligent planning, personalized guidance, progress tracking, AI-powered interview practice, and ongoing recommendations.

**Vision:** every student and early-career professional should have access to a personal, always-available career strategist that actually knows their history, not a generic tool they have to re-explain themselves to every time.

**Mission:** replace fragmented, one-off tools (a course here, a mock interview app there, a spreadsheet tracking applications) with a single connected system that remembers everything about a user's career journey and uses that memory to make every subsequent interaction smarter.

**Core purpose:** turn scattered learning activity into measurable, goal-directed career progress.

**Target audience:** primarily engineering students and early-career job seekers, with particular attention to users from tier-2/3 cities in India who may have strong technical potential but limited access to structured mentorship, placement guidance, or interview practice.

**Problems it solves:**
- Students don't know what to learn next relative to a specific target role.
- Learning activity (courses, videos, tutorials) doesn't translate into a clear sense of "am I actually ready?"
- Interview practice is either unavailable, unrealistic, or disconnected from a user's actual skill gaps.
- Career guidance today is either generic (a chatbot with no memory of you) or expensive (a human mentor/consultant).

**Long-term vision:** CareerOS AI becomes a career-long companion — not just a tool used during the job search, but a system a user returns to across multiple career transitions, each time starting from an already-rich understanding of who they are and where they've been.

---

# 2. Product Philosophy

- **AI augments the user; it does not replace their agency.** CareerOS AI plans, personalizes, evaluates, and recommends — the user always makes the final decisions about their own career.
- **Personalization must be evidence-driven, not assumption-driven.** The system prefers what a user has actually demonstrated (quiz scores, completed checklist items, interview performance) over what they merely claim about themselves.
- **The user owns their career data.** Every module treats user-generated data (skills, goals, progress, interview responses) as belonging to the user, not as a data asset the platform extracts value from independently of them.
- **Career growth should be measurable.** Every feature should ultimately answer, directly or indirectly, "is this user closer to their goal than they were before?"
- **Every feature earns its place by contributing to long-term career success** — not by being a trendy standalone capability. A feature that doesn't feed into planning, tracking, or readiness doesn't belong in the product.
- **The Career Digital Twin is the central intelligence layer.** It is the mechanism by which "evidence-driven" and "personalized" actually become true in practice — see Section 6.

---

# 3. Product Goals

| Goal | What it means for the user |
|---|---|
| **Career Planning** | Turn a vague ambition ("I want to work in backend engineering") into a concrete, sequenced plan. |
| **Career Tracking** | Always know, at a glance, how far along that plan the user actually is — based on evidence, not guesswork. |
| **Personalized Learning** | Receive a roadmap and pacing that reflects the user's actual background and goal, not a generic curriculum. |
| **AI Career Coaching** | Have an ongoing conversational relationship with a system that already knows the user's context, rather than re-explaining their situation every time. |
| **Interview Preparation** | Practice in a way that's both genuinely adaptive (coaching mode) and genuinely realistic (company-simulation mode). |
| **Continuous Improvement** | Receive concrete next steps as circumstances change, so the user is never stuck wondering "what do I do next?" |

---

# 4. User Journey

**1. Onboarding.** A new user registers, then completes their profile — education background, current skills, and interests. This is the platform's first, thinnest picture of the user.

**2. Goal-setting.** The user defines a career goal — a target role, and optionally target companies and a timeline. This goal becomes the reference point every subsequent module works toward.

**3. Roadmap generation.** The moment a goal is set, the AI Roadmap Engine generates a personalized learning roadmap — organized into modules, topics, subtopics, and checklist items — using everything known so far (profile, goal, any existing skills). Some parts of this roadmap are mandatory foundations the user cannot skip; other parts are recommended or optional and can be reordered or supplemented.

**4. Active learning.** The user works through the roadmap. As they complete checklist items, take quizzes and module assessments, and (optionally) submit projects, the platform is continuously collecting evidence of real competency — not just activity.

**5. Progress becomes visible.** The Learning Tracker translates this evidence into a clear picture of progress per module and overall, and the user always understands *why* their progress stands where it does.

**6. Interview practice.** As the user progresses, they can enter Practice Mode mock interviews, which adapt to their specific weak areas and reinforce recently learned material — this is coaching, not testing. When they feel ready for something closer to the real thing, Company Interview Mode simulates an actual company/role/round combination realistically, without softening based on what the platform already knows about the user's weaknesses.

**7. Readiness becomes a number the user can trust.** All of this evidence — progress, assessments, interview performance — is synthesized into a Career Readiness signal: not just a score, but an explainable breakdown of where the user stands.

**8. Recommendations close the loop.** Based on the user's full context and current readiness gaps, the Recommendation Engine surfaces concrete next actions — revisit a weak topic, attempt another mock interview, pursue an optional skill relevant to a target company.

**9. The chatbot is always available alongside this.** At any point in the journey, the user can talk to the Personalized AI Career Chatbot — about their roadmap, their last interview, their progress, or just for motivation — and the conversation is always grounded in their actual history, not a blank slate.

**10. The journey continues, not ends.** As the user's goal evolves (a new target role, a new target company), the roadmap and readiness recalibrate around the new target while preserving everything already demonstrated. CareerOS AI is designed to be useful across an entire career, not just a single job search.

---

# 5. Detailed Module Specifications

## 5.1 Authentication

**Purpose:** Establish a verified, persistent identity for the user, so every other module can build a continuous history around that identity.

**Business Responsibilities:** Account creation, secure login, session management, password recovery.

**Why this module exists:** Without a durable identity, there is no "twin," no roadmap continuity, no progress history — the entire value proposition of remembering the user depends on this module.

**Problems it solves:** Ensures a user's career history is theirs alone, persists across sessions and devices, and cannot be accessed by anyone else.

**User Benefits:** Trust that their career data is private and safely tied to their own account.

**Primary Inputs:** Credentials or an OAuth identity.

**Primary Outputs:** An authenticated session.

**Business Rules:** One identity per user; no career data exists without an authenticated identity behind it.

**Interaction with other modules:** Every other module references this identity; it does not consume career data from other modules itself.

**AI involvement:** None.

**Future extensibility:** Multi-factor authentication, institution-linked sign-in.

## 5.2 User Profile & Onboarding

**Purpose:** Capture the user's starting context — background, education, current skills, interests — before any learning history exists.

**Business Responsibilities:** Collecting and maintaining profile information; guiding first-time users through initial setup.

**Why this module exists:** The system needs *some* picture of the user on day one, before any evidence has accumulated, to avoid a cold, generic first experience.

**Problems it solves:** Removes the "blank slate" problem — a brand-new user still gets a reasonably personalized roadmap on day one.

**User Benefits:** A faster, more relevant start; less time spent on generic content that doesn't match their actual background.

**Primary Inputs:** User-entered education, target role interest, existing skills, interests.

**Primary Outputs:** A profile object used to seed personalization.

**Business Rules:** Profile is never mandatory-complete to use the platform, but incompleteness visibly reduces personalization quality rather than silently degrading it.

**Interaction with other modules:** Feeds Career Goals, AI Roadmap Engine, and the Career Digital Twin.

**AI involvement:** None directly (AI consumes this data downstream, doesn't generate it).

**Future extensibility:** Resume import to pre-fill profile fields automatically.

## 5.3 Career Goals

**Purpose:** Define the explicit target the rest of the system optimizes toward.

**Business Responsibilities:** Letting the user set, view, and change their target role (and optionally target companies/timeline).

**Why this module exists:** Personalization is meaningless without a target — "personalized toward what?" This module answers that question.

**Problems it solves:** Prevents the platform from defaulting to generic, one-size-fits-all guidance.

**User Benefits:** Clarity — the user always knows what the platform believes they're working toward, and can correct it at any time.

**Primary Inputs:** User-selected or entered target role, companies, timeline.

**Primary Outputs:** An active career goal.

**Business Rules:** One active goal at a time in the current MVP; changing the goal triggers a recalibration of the roadmap rather than starting over from zero.

**Interaction with other modules:** Drives AI Roadmap Engine generation, Career Readiness Engine scoring target, and feeds the Career Digital Twin.

**AI involvement:** None directly — this module is deterministic; AI features downstream consume the goal as input.

**Future extensibility:** Multiple parallel goals, goal suggestions based on market trends.

## 5.4 AI Roadmap Engine

**Purpose:** Replace static, generic learning paths with a roadmap generated specifically for this user's goal and background.

**Business Responsibilities:** Generating the roadmap; distinguishing mandatory foundations from recommended and optional content; allowing safe personalization; triggering assessments at the right points; recalibrating when the goal changes.

**Why this module exists:** A generic curriculum wastes the time of both a user who already knows the basics and a user who needs more foundational support — this module tailors pacing and content to the individual while protecting the parts of a learning path that genuinely cannot be skipped.

**Problems it solves:** "What should I actually learn, in what order, given who I already am and where I want to go?"

**User Benefits:** A learning plan that feels built for them, not generic; confidence that they aren't missing a foundational concept just because they reordered optional content.

**Primary Inputs:** Career goal, profile, existing skills, learning history, assessment results, Career Digital Twin context.

**Primary Outputs:** A structured roadmap (modules → topics → subtopics → checklist items), each tagged mandatory, recommended, or optional.

**Business Rules:** Mandatory prerequisite content can never be removed or skipped by the user, regardless of personalization; assessments gate progression between modules; a goal change triggers roadmap recalibration, not roadmap deletion.

**Interaction with other modules:** Consumes Career Goals, User Profile, Skill Tracking, and Career Digital Twin context; feeds Learning Tracker, and indirectly Career Readiness.

**AI involvement:** Central — the roadmap itself is AI-generated and periodically informed by evolving evidence.

**Future extensibility:** Multiple valid alternate learning paths (branching roadmaps).

## 5.5 Learning Tracker

**Purpose:** Provide an honest, evidence-based measure of how far along the user actually is — never just "how much have they clicked through."

**Business Responsibilities:** Aggregating checklist completion, quiz results, assessment results, and mock interview outcomes into a coherent progress picture.

**Why this module exists:** Activity is not the same as competency; this module exists specifically to prevent progress from becoming a vanity metric.

**Problems it solves:** "Have I actually learned this, or did I just mark it done?"

**User Benefits:** A trustworthy sense of real standing, not an inflated completion percentage.

**Primary Inputs:** Roadmap checklist events, quiz/assessment scores, mock interview evaluations.

**Primary Outputs:** Progress figures per module and overall.

**Business Rules:** Progress is always computed from multiple evidence sources; checklist completion alone is never sufficient.

**Interaction with other modules:** Consumes AI Roadmap Engine, Assessments, and Mock Interview outputs; feeds Career Readiness Engine and the Career Digital Twin.

**AI involvement:** Indirect — the underlying evidence (assessments, interviews) may be AI-evaluated, but the aggregation logic itself is deterministic.

**Future extensibility:** Incorporating external, verified evidence (e.g., certificates) as an additional signal.

## 5.6 Career Digital Twin

See Section 6 for full treatment — this module is the connective intelligence layer referenced by nearly every other module.

## 5.7 Projects

**Purpose:** Give users a place to apply what they've learned to something tangible, and generate portfolio-worthy evidence of applied skill.

**Business Responsibilities:** Suggesting relevant project briefs tied to roadmap progress; accepting user submissions.

**Why this module exists:** Learning that never gets applied is weaker evidence of readiness than learning that's been used to build something.

**Problems it solves:** "I've studied this — but can I actually use it?"

**User Benefits:** Portfolio material; a more concrete, demonstrable form of progress than quiz scores alone.

**Primary Inputs:** Roadmap module context; user-submitted project links/descriptions.

**Primary Outputs:** Project submission records.

**Business Rules:** Self-marked completion is treated as weaker, non-verified evidence relative to graded assessments.

**Interaction with other modules:** Suggested by AI Roadmap Engine; contributes (lightly, in MVP) to Learning Tracker evidence.

**AI involvement:** Minimal in MVP (project briefs may be AI-suggested); no AI evaluation of submissions yet.

**Future extensibility:** Peer review, AI-assisted project evaluation, portfolio export.

## 5.8 Assessments

**Purpose:** Provide graded checkpoints that gate roadmap progression and supply the strongest form of evidence to the Learning Tracker.

**Business Responsibilities:** Presenting quizzes per topic and assessments per module; grading; recording results.

**Why this module exists:** Some form of evidence needs to be both objective and comparable across users and time — assessments provide that.

**Problems it solves:** "Did the user actually retain this, or did they just complete the checklist item?"

**User Benefits:** Confidence that "completed" means something real; a clear signal of where they're weak.

**Primary Inputs:** Roadmap-triggered assessment requests; user answers.

**Primary Outputs:** Scores and per-question breakdowns.

**Business Rules:** A module assessment must be attempted before the next module unlocks.

**Interaction with other modules:** Triggered by AI Roadmap Engine; feeds Learning Tracker and Skill Tracking.

**AI involvement:** May assist in question generation from topic content; grading of objective question types is deterministic in MVP.

**Future extensibility:** AI-graded open-ended responses with rubric-based feedback.

## 5.9 Mock Interview

**Purpose:** Let users practice interviewing in two deliberately different modes — one built for coaching, one built for realism.

**Business Responsibilities:**
- **Practice Mode:** retrieves the user's full context (skills, progress, weak areas, prior interviews) before generating questions; adapts difficulty and follow-ups; gives coaching-oriented feedback.
- **Company Interview Mode:** generates questions based only on company, role, experience level, and interview round — deliberately *without* consulting the user's personal context during the interview — to simulate a realistic, unadapted interview experience. Personalized write-back to the user's history happens only after the interview ends.

**Why this module exists:** Coaching and realistic simulation are different needs that shouldn't be blended — a user who wants to know "am I actually ready for this specific interview" needs a mode that doesn't quietly go easier on their known weak spots.

**Problems it solves:** Lack of accessible, adaptive interview coaching; lack of realistic practice that mirrors an actual hiring process.

**User Benefits:** Two distinct, honest forms of practice depending on what the user needs at that moment.

**Primary Inputs:** For Practice Mode — full user context. For Company Mode — company/role/round only.

**Primary Outputs:** Interview transcripts, evaluations, and feedback.

**Business Rules:** Company Interview Mode must never personalize questions using the user's history mid-interview; both modes update the user's history and readiness only after completion.

**Interaction with other modules:** Practice Mode reads from the Career Digital Twin; both modes write results to Learning Tracker, Career Readiness Engine, the Career Digital Twin, and can trigger new Recommendations.

**AI involvement:** Central to both modes — question generation, adaptive follow-up (Practice Mode only), and evaluation.

**Future extensibility:** Additional interview formats (panel, behavioral-only, technical whiteboard).

## 5.10 AI Recommendation Engine

**Purpose:** Turn the user's current context and readiness gaps into concrete next actions.

**Business Responsibilities:** Generating a small, prioritized set of next steps and keeping them current as circumstances change.

**Why this module exists:** A platform that only shows data (progress bars, scores) without guidance leaves the user to figure out "so what do I actually do now?" themselves.

**Problems it solves:** Decision fatigue — "I have all this information, what's the single most useful thing to do next?"

**User Benefits:** A sense of active guidance rather than passive dashboards.

**Primary Inputs:** Career Digital Twin context, Career Readiness output.

**Primary Outputs:** A prioritized recommendation list.

**Business Rules:** Recommendations should not repeat/duplicate ones already active and undismissed.

**Interaction with other modules:** Reads from Career Digital Twin and Career Readiness Engine; recommendations may be surfaced by the chatbot in conversation.

**AI involvement:** Central — recommendation generation is an AI reasoning task grounded in real evidence.

**Future extensibility:** Recommending specific external resources once external integrations exist.

## 5.11 Personalized AI Career Chatbot

See Section 7 for full treatment — this is a first-class product module, not a support feature.

## 5.12 Dashboard

**Purpose:** Give the user a single, coherent view of where they stand across their entire career journey at a glance.

**Business Responsibilities:** Surfacing current roadmap progress, readiness, active recommendations, and recent activity in one place.

**Why this module exists:** With this many modules generating information, the user needs one place that synthesizes it rather than having to visit each module separately to piece together their own status.

**Problems it solves:** Fragmented visibility across many modules.

**User Benefits:** A quick, honest answer to "where do I stand right now?" every time they open the app.

**Primary Inputs:** Progress, readiness, recommendations, and recent activity from other modules.

**Primary Outputs:** A synthesized view; no data of its own.

**Business Rules:** The dashboard never computes its own version of progress or readiness — it only displays what the owning modules have already computed.

**Interaction with other modules:** Read-only consumer of nearly every module's output.

**AI involvement:** None directly — it is a presentation layer over already-computed, already-personalized data.

**Future extensibility:** Customizable widgets, trend views once Future Analytics exists.

## 5.13 Settings & Notifications

**Purpose:** Let users control their account, preferences, and how/when the platform communicates with them.

**Business Responsibilities:** Account settings, notification preferences, basic in-app alerts.

**Why this module exists:** Every product needs a place for account-level control that doesn't belong inside any single career-focused module.

**Problems it solves:** Keeps account-management concerns separate from career-domain concerns, so career modules stay focused on career logic.

**User Benefits:** Control over their own experience and communication preferences.

**Primary Inputs:** User preference selections.

**Primary Outputs:** Notification/preference state.

**Business Rules:** Notification preferences never override safety-relevant or account-security communications.

**Interaction with other modules:** Can be triggered by events from other modules (e.g., a new recommendation) but owns none of their underlying data.

**AI involvement:** None.

**Future extensibility:** Push notifications, external calendar/reminder sync.

---

# 6. Career Digital Twin

**What it is:** The Career Digital Twin is a continuously updated, aggregated representation of everything the platform knows about a user's career context — their goal, background, skills, learning progress, assessment history, interview performance, and readiness — maintained separately from any single module's own records.

**Why it exists:** Without it, every AI feature (roadmap generation, chatbot responses, interview coaching, recommendations) would need to independently gather and reconcile data from every business module, every time it needed to personalize something. The Twin exists so that personalization is fast, consistent, and doesn't require re-deriving a user's context from scratch on every AI interaction.

**Why it is the central intelligence layer:** It is the one place where a *complete* picture of the user exists at any moment. Individual modules each know their own slice (Assessments knows scores, Mock Interview knows interview history) but none of them, alone, know the whole person. The Twin is what lets the platform behave as if it "remembers" the user holistically, rather than as a collection of disconnected features that each only know their own corner.

**What information it stores (conceptually):**
- Identity and goal context — target role, education, interests
- Skill state — what's acquired, at what confidence, and how that compares to the target role's requirements
- Learning state — roadmap progress, current pacing
- Evidence state — assessment scores, quiz history, mock interview outcomes, identified weak areas
- Readiness state — the latest overall readiness picture

**Important distinction:** the Twin does not *own* any of this data in the business sense — each originating module remains the authoritative source. The Twin holds an aggregated, AI-consumable *view* of that data, kept in sync as the underlying modules change.

**How it continuously evolves:** Every time something meaningful happens elsewhere in the platform — a roadmap module completed, a quiz scored, an interview finished — the Twin's relevant slice of context updates. It is always reflecting the user's most current state, never a stale snapshot from onboarding.

**How other modules use it:**
- The AI Roadmap Engine reads it to generate and recalibrate a personalized roadmap.
- Practice Mode Mock Interviews read it to ask questions targeted at actual weak areas.
- The Recommendation Engine reads it to decide what to suggest next.
- The Personalized AI Career Chatbot reads it constantly, in nearly every conversation, to stay grounded in the user's real situation.
- Company Interview Mode is the deliberate exception — it does not read the Twin during an interview, by design (see Section 5.9), because realism there matters more than personalization.

**How it enables personalization:** Because the Twin already holds a synthesized, current view of the user, any AI feature can ask "who is this person, right now, in the context relevant to me" and get a fast, coherent answer — rather than personalization depending on each feature's own ad hoc data-gathering. This is what makes CareerOS AI's personalization feel consistent across the entire product rather than fragmented feature-by-feature.

---

# 7. Personalized AI Career Chatbot

The chatbot is a first-class product module — the primary conversational surface of CareerOS AI — not a support widget bolted onto the side of the product.

**What it is not:** It is not a general-purpose assistant like a generic AI chat product. It has no interest in answering arbitrary questions unrelated to the user's career journey, and it does not present itself as an all-purpose tool.

**What it is:** An AI Career Coach — a conversational interface to the same intelligence that powers the rest of the platform, always grounded in the user's actual history rather than starting fresh each conversation.

**Purpose:** Give users a natural, conversational way to engage with their own career context — asking questions, getting explanations, and receiving guidance — without needing to know which specific module holds the answer.

**Responsibilities / Supported conversations:**
- **Learning guidance** — explaining a roadmap topic or clarifying why something is sequenced the way it is
- **Career advice** — discussing options and tradeoffs relative to the user's stated goal
- **Roadmap discussions** — why a module is mandatory, what's coming up next, how to adjust optional content
- **Interview preparation** — talking through recent mock interview performance, or preparing mentally for an upcoming one
- **Project discussions** — brainstorming or discussing an in-progress project
- **Assessment explanations** — helping the user understand why they got a question wrong, or what a score actually reflects
- **Motivation** — encouragement grounded in the user's real progress, not generic pep talk
- **Progress review** — walking the user through their own Learning Tracker and Readiness state in plain language
- **Study planning** — helping the user think through how to fit upcoming roadmap items into their available time
- **Recommendation explanation** — explaining *why* a particular recommendation was surfaced, not just repeating it

**Personalization requirement:** every response should draw, as relevant to the question, on the Career Digital Twin, the user's roadmap, learning progress, projects, assessments, career goals, mock interview history, active recommendations, and the ongoing conversation itself. A response that could have been given to any user regardless of their history is a failure of this module's core purpose.

**Why this creates a significantly better experience than a generic chatbot:** A generic assistant has to be told the user's situation from scratch in every conversation, and it forgets it the moment the conversation ends. This chatbot already knows the user's roadmap, their last interview's weak areas, and what they've been working on this week — so a question like "how am I doing?" gets a specific, grounded answer instead of a request for more information. This is the product's most direct expression of the Career Digital Twin's value to the end user.

---

# 8. AI Usage Across the Product

**Modules where AI is central:**
- AI Roadmap Engine (roadmap generation and recalibration)
- Mock Interview — both modes (question generation, adaptive follow-up in Practice Mode, evaluation)
- AI Recommendation Engine (synthesizing next actions from context)
- Personalized AI Career Chatbot (the entire conversational experience)
- Career Readiness Engine (generating an explainable narrative around a readiness score, in addition to the score itself)

**Modules that remain deterministic:**
- Authentication
- User Profile & Onboarding (data collection itself)
- Career Goals (goal storage/management)
- Learning Tracker (the aggregation logic that turns evidence into progress figures)
- Assessments (grading of objective question types)
- Dashboard (pure presentation of already-computed data)
- Settings & Notifications

**Why AI should only be used where intelligence is actually required:** Using AI for tasks that are naturally rule-based (grading a multiple-choice quiz, storing a goal, displaying a progress figure someone else already computed) adds cost, latency, and unpredictability without adding value. AI earns its place in this product specifically where genuine judgment, generation, or adaptive reasoning is required — generating a roadmap that fits a specific person, adapting interview difficulty in real time, deciding what a specific user should do next, or holding a natural conversation grounded in that user's history. Everywhere else, deterministic logic is more reliable, more explainable, and cheaper to run — and the product is better for using AI only where it's genuinely earning its keep.

---

# 9. Module Interaction Overview

At a business level, information flows through the platform roughly as follows:

- **Onboarding data (Profile, Career Goals)** seeds everything downstream — without it, the AI Roadmap Engine has nothing to generate against.
- **The AI Roadmap Engine** takes that seed context and produces structure (the roadmap) that the **Learning Tracker**, **Projects**, and **Assessments** modules all operate against.
- **Assessments and Mock Interview** are the platform's two strongest evidence sources — both feed the **Learning Tracker**, which turns raw evidence into a trustworthy progress picture.
- **The Learning Tracker's** output, combined with interview performance, feeds the **Career Readiness Engine**, which is the platform's synthesized answer to "how ready is this user, really?"
- **The Career Digital Twin** sits alongside all of this, continuously absorbing updates from nearly every module and making a unified view available to whichever AI feature needs it — it is not a step in this chain so much as a lens over the whole chain.
- **The Recommendation Engine** sits downstream of Readiness and the Twin, translating "where the user stands" into "what they should do next."
- **The Chatbot** can be entered from anywhere and draws on the full width of this chain at any time — it is not a separate silo but a conversational lens over the same underlying state.
- **The Dashboard** is a pure aggregator at the very end of this chain — it computes nothing itself, only displays what other modules have already determined.
- **Settings & Notifications** sits outside this career-data chain entirely, governing account and communication preferences rather than career content.

The consistent pattern: business modules own their own data and enrich the shared context (via the Twin) rather than reaching into each other directly. Downstream modules (Readiness, Recommendations, Chatbot, Dashboard) consume that enriched context rather than each re-deriving it independently.

---

# 10. Product Boundaries

CareerOS AI intentionally does **not**:

- **Build resumes.** Resume construction is a distinct, well-served problem space; conflating it with career planning would dilute the product's core focus on *progress*, not *presentation*.
- **Build portfolios.** Similarly a presentation concern, not a planning/tracking concern — belongs outside the current product boundary.
- **Track job applications.** Application tracking is an operational, logistics-oriented need, different in kind from planning and skill development.
- **Provide deep, standalone skill-testing beyond what supports the roadmap.** The product tests skills insofar as it needs evidence for progress and readiness — it does not aim to be a comprehensive skills-certification platform.
- **Operate a recruiter-facing portal.** CareerOS AI is built around the user's own journey, not around serving employer-side hiring workflows.
- **Operate a marketplace or course catalog.** The product deliberately does not host or sell learning content — it plans and personalizes around external learning resources rather than becoming a content provider itself.
- **Act as a company-side dashboard or analytics product.** All current product surfaces are user-facing; no institutional or employer view exists in the current product.

**Why these boundaries exist:** Each of these is a legitimate, valuable problem — but solving it well requires a different product shape, different user (in some cases, e.g. recruiters, an entirely different customer), and different success metrics than "is this specific user's career progressing." Pulling any of these into the current product would dilute focus and risk turning CareerOS AI into a shallow version of several different products rather than an excellent version of one coherent one.

---

# 11. Future Vision

The following are explicitly **outside the current MVP** and are mentioned here only to establish that they are anticipated, not to describe committed scope or timing:

- **Resume Builder** — generating a resume informed by the user's actual roadmap, project, and skill history.
- **Portfolio Builder** — presenting completed projects and demonstrated skills externally.
- **Job Tracker** — logging and tracking active job applications alongside career readiness.
- **Recruiter Portal** — a employer-facing surface, likely with the user's explicit consent to share readiness/skill data.
- **Marketplace** — potential integration with external learning providers, informed by the Future Integrations extensibility already reserved at the architecture level.
- **Analytics** — trend views over time (progress-over-time, readiness-over-time), building on the append-only evidence history already retained by the current MVP.

None of these should influence current-MVP design decisions beyond ensuring today's data model doesn't actively foreclose them later.

---

# 12. Product Design Decisions

| Decision | Reason | Expected Impact |
|---|---|---|
| **The Career Digital Twin is the central intelligence layer.** | Every AI feature needs a consistent, current view of the user; without a shared layer, personalization becomes inconsistent and expensive to maintain across features. | Coherent, consistent personalization across the entire product rather than feature-by-feature approximations of "knowing the user." |
| **The AI Roadmap is generated once and evolves over time, rather than fully regenerated on every change.** | Users need continuity — a roadmap that reshuffles itself unpredictably erodes trust and wastes prior planning effort. | Users experience a stable, trustworthy plan that adapts without feeling like it's starting over. |
| **The chatbot always personalizes responses using full user context.** | A career coach that doesn't remember you isn't meaningfully better than a search engine. | Differentiates CareerOS AI's conversational experience clearly from generic AI chat tools. |
| **Evidence is preferred over assumptions or self-report wherever both exist.** | Self-reported confidence is unreliable; the product's core value proposition depends on users trusting their own progress and readiness numbers. | Higher user trust in the platform's assessment of their own standing. |
| **Business logic remains deterministic wherever AI isn't genuinely required.** | AI introduces cost, latency, and variability; reserving it for judgment-requiring tasks keeps the product fast, predictable, and explainable where explainability matters most (e.g., grading). | A product that feels reliable and fast for routine operations, with AI reserved for where it visibly adds value. |
| **Company Interview Mode deliberately withholds personalization during the interview itself.** | Realistic simulation requires the platform to *not* soften questions based on known weaknesses — otherwise the mode fails at its one job: telling the user how they'd actually do. | Users get a genuinely trustworthy readiness signal from this mode, distinct from and complementary to the coaching value of Practice Mode. |
| **Mandatory roadmap content can never be removed or reordered by personalization.** | Foundational learning dependencies are non-negotiable for real competency, regardless of a user's preferences. | Protects the integrity of what "roadmap completion" actually means, even as the product becomes more personalized elsewhere. |
