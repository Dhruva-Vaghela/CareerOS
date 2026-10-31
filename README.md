# CareerOS AI

> **AI-powered career development and interview preparation platform**

---

## Team Information

**Team Name:** Gamma

**Team Members:**

* Dhruva Vaghela
* Srushtti Kadam
* Yesha Parwani
* Deepshikha Chaurasia

---

## Overview

CareerOS AI is a career development platform for students and early-career professionals. The repository currently includes authentication and profile flows, career goals, resume analysis, AI roadmap generation, Career Digital Twin context, assessments, projects, and Company Interview Mode.

Unlike traditional mock interview platforms, CareerOS AI uses a **Career Digital Twin**—an event-driven context layer that aggregates career information from implemented services. Its current context does not yet include every area named in the product vision.

Some capabilities described in the product and architecture documents are still planned or only partially implemented. In particular, do not assume Practice Mode, full skill tracking, evidence-based progress, readiness, or recommendations are complete just because they are part of the product vision.

---

## Vision

To become an intelligent career companion that continuously understands, guides, and prepares individuals for every stage of their professional journey through AI-powered personalized interview experiences.

---

## Core Features

* Career goals and user profile management
* Resume upload and analysis
* AI-generated learning roadmaps
* Career Digital Twin context aggregation
* Project tracking and assessments
* Company Interview Mode, including voice-related endpoints
* Web onboarding, dashboard, and profile experience

---

## Interview Modes

### Practice Mode

Practice Mode is part of the product vision and is not yet a complete implemented workflow.

### Company Interview Mode

The implemented interview service includes Company Interview Mode for role- and company-specific simulations. Its current scope should not be read as a claim that every planned interview feature is complete.

---

## Career Digital Twin

The Career Digital Twin is the foundation of CareerOS AI.

It is an event-driven context aggregation layer. Its available context reflects the modules and events currently implemented; it does not yet include every partition described in the architecture.

This enables AI to deliver highly personalized interview experiences while each module remains the source of truth for its own data.

---

## Workflow

The flow below is the intended product workflow; not every stage is implemented or connected yet.

```text
User Request
      │
      ▼
Business Services
      │
      ▼
Career Digital Twin
      │
      ▼
AI Context Generation
      │
      ▼
Interview Question Generation
      │
      ▼
User Response (Voice/Text)
      │
      ▼
AI Evaluation & Follow-up Questions
      │
      ▼
Feedback & Performance Analysis
      │
      ▼
Career Digital Twin Update
      │
      ▼
Personalized Recommendations
```

---

---

## Technology Stack

### Current Implementation
* **Architecture:** Monorepo with npm workspaces (`apps/*`, `packages/*`, `services/*`)
* **Frontend:** React 19, TypeScript, Vite, CSS
* **Backend:** Node.js (>=20.16.0 or >=22.3.0), Express, TypeScript (`tsx`)
* **Database:** MongoDB via Mongoose
* **AI Orchestration:** Groq Provider (`ai-client`) with structured outputs, prompt manager, retry engine, and telemetry
* **File & Resume Storage:** Cloudinary (`services/resume`)
* **Testing:** Vitest
* **Code Quality:** ESLint / Prettier for backend and packages; Oxlint is configured in the web workspace

### Planned Ecosystem Expansion
* Redis (caching & pub/sub expansion)
* Vector Database & RAG
* Browser Speech Recognition / Synthesis APIs

---

## Service Architecture & Port Mapping

| Service | Port | Directory | Description |
|---|---|---|---|
| **Web Frontend** | `5173` | `apps/web` | Vite + React Web Application |
| **Auth Service** | `3001` | `services/auth` | JWT Authentication, Registration, Login, Session Management |
| **Profile Service** | `3002` | `services/profile` | User Profile, Skills, Background, Experiences |
| **Career Goals Service** | `3003` | `services/career-goals` | Target Roles, Goal Lifecycles, Active Goal Tracking |
| **Resume Service** | `3004` | `services/resume` | Resume PDF Upload, Parsing & Cloudinary Storage |
| **Digital Twin Service** | `3005` | `services/digital-twin` | Event-driven Context Aggregation & Querying |
| **Roadmap Engine Service** | `3006` | `services/roadmap-engine` | AI-Powered Personalized Curriculum & Milestone Tracking |
| **Assessment Service** | `3007` | `services/assessment` | Assessment generation and scoring |
| **Projects Service** | `3008` | `services/projects` | Project tracking and GitHub integration |
| **Interview Service** | `3009` | `services/interview` | Company interviews, history, and voice routes |
| **Health Check Service** | `3000` (standalone) | `services/health-check` | Database and service diagnostics; not included in `npm run dev` |

---

## Quick Start

> **Full Cross-Platform Setup Guide**: See [SetUpGuide.md](SetUpGuide.md) for Windows and macOS/Linux instructions.

```bash
# 1. Install dependencies across workspaces
npm install

# 2. Configure environment
# macOS / Linux:
cp .env.example .env
# Windows (PowerShell):
Copy-Item .env.example .env

# 3. Build shared packages (required)
npm run build

# 4. Verify MongoDB connection
node test-mongo-connection.js

# 5. Run tests
npm test

# 6. Start full application (backend + web)
npm run dev
```

Visit **http://localhost:5173** to interact with the application.

---

## Engineering Principles

CareerOS AI follows modern software engineering practices:

* Domain-Driven Design (DDD)
* Clean Architecture
* Modular Monolith / Microservices (MVP)
* SOLID Principles
* Security by Design
* High Cohesion & Loose Coupling
* Architecture Before Implementation
* Documentation-First Development

---

## Long-Term Goal

To build a scalable, AI-powered interview preparation platform that combines adaptive learning, realistic interview simulation, and continuous career profiling to help users confidently prepare for career opportunities across multiple industries and domains.
