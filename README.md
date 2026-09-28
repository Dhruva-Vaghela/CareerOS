# CareerOS AI

> **AI-Powered Mock Interview Platform with a Career Digital Twin**

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

CareerOS AI is an AI-powered mock interview platform that helps students and professionals prepare for real-world interviews through intelligent, interactive, and personalized interview experiences.

Unlike traditional mock interview platforms, CareerOS AI leverages a **Career Digital Twin**—a dynamic digital representation of a user's skills, learning progress, projects, resume, portfolio, interview history, and career goals—to understand each user's professional journey and deliver highly personalized interview preparation.

The platform combines adaptive AI coaching, realistic company interview simulations, voice interaction, and continuous performance tracking to help users build confidence and improve interview readiness across multiple domains.

---

## Vision

To become an intelligent career companion that continuously understands, guides, and prepares individuals for every stage of their professional journey through AI-powered personalized interview experiences.

---

## Core Features

* AI-Powered Mock Interviews
* Practice Interview Mode
* Company Interview Simulation
* Career Digital Twin
* AI Follow-up Questions
* Voice & Text Interview Support
* Interview Performance Analysis
* Personalized Feedback
* Interview Readiness Tracking
* AI Recommendations
* Progress Analytics

---

## Interview Modes

### Practice Mode

An adaptive interview mode where AI acts as a personal career coach by generating questions based on the user's skills, learning progress, projects, previous interviews, resume, career goals, and Career Digital Twin. The objective is continuous learning and improvement.

### Company Interview Mode

A realistic interview simulation that generates role- and company-specific interview experiences based on industry-standard interview patterns, helping users prepare for actual recruitment processes.

---

## Career Digital Twin

The Career Digital Twin is the foundation of CareerOS AI.

It is a continuously evolving digital representation of a user's professional journey that combines skills, learning progress, projects, resumes, portfolios, interview history, goals, strengths, and preferences into a unified profile.

This enables AI to deliver highly personalized interview experiences while each module remains the source of truth for its own data.

---

## AI Workflow

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
* **Frontend:** React 18, TypeScript, Vite, TailwindCSS / Vanilla CSS
* **Backend:** Node.js (>=20.0.0), Express, TypeScript (`tsx`)
* **Database:** MongoDB Atlas / Local MongoDB via Mongoose
* **AI Orchestration:** Groq Provider (`ai-client`) with structured outputs, prompt manager, retry engine, and telemetry
* **File & Resume Storage:** Cloudinary (`services/resume`)
* **Testing:** Vitest (unit & integration test suites)
* **Code Quality:** ESLint & Prettier

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
| **Health Check Service** | - | `services/health-check` | Database & Service Connectivity Diagnostics |

---

## Quick Start

> **Full Cross-Platform Setup Guide**: See **[SetUpGuide.md](file:///Users/yeshaparwani/Documents/Projects-Learn/CareerOS/SetUpGuide.md)** for detailed Windows and macOS instructions.

```bash
# 1. Install dependencies across workspaces
npm install

# 2. Configure environment
# macOS / Linux:
cp .env_Example .env
# Windows (PowerShell):
Copy-Item .env_Example .env

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

## Project Status

🚀 **Phase 1 Foundation Implemented & Verified**

The core foundation, AI reasoning pipeline, authentication, profile, career goals, resume parsing, digital twin synchronization, and web frontend are implemented and passing all 15 test suites.

Next phase on the roadmap: **AI Roadmap Engine & Skill Tracking**.

See `roadmap-2.md` and `todo-2.md` for the latest roadmap and task status.

---

## Long-Term Goal

To build a scalable, AI-powered interview preparation platform that combines adaptive learning, realistic interview simulation, and continuous career profiling to help users confidently prepare for career opportunities across multiple industries and domains.
