import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { AIOrchestrator, ProviderFactory } from '@careeros/ai-client';
import { createLogger } from '@careeros/logger';
import { HiringDecision } from '@careeros/shared-types';

const logger = createLogger('company-ai-generator');

// --- Types & Schemas ---

export interface GeneratedQuestionItem {
  questionText: string;
  category: string;
  difficulty: string;
  rubricCriteria: string[];
}

export interface GeneratedQuestionsOutput {
  companyName: string;
  jobRole: string;
  roundType: string;
  questions: GeneratedQuestionItem[];
}

export interface EvaluatedResponseOutput {
  score: number; // 0-100
  feedback: string;
  strengths: string[];
  improvements: string[];
  technicalAccuracy: number; // 0-100
  communicationClarity: number; // 0-100
  alignmentWithRole: number; // 0-100
}

export interface QuestionFeedbackJustification {
  questionId?: string;
  order: number;
  questionText: string;
  category?: string;
  difficulty?: string;
  userResponse: string;
  score: number;
  feedback: string;
  expectedCriteria: string[];
  missedCriteria: string[];
  strengths: string[];
  technicalAccuracy?: number;
  communicationClarity?: number;
}

export interface FinalFeedbackOutput {
  summary: string;
  overallScore: number; // 0-100
  hiringDecision: HiringDecision;
  strengths: string[];
  weakAreas: string[];
  recommendations: string[];
  categoryBreakdown: Record<string, number>;
  questionsFeedback?: QuestionFeedbackJustification[];
}

// Zod schemas for structured validation
const GeneratedQuestionItemSchema = z.object({
  questionText: z.string().min(10),
  category: z.string().default('General Technical'),
  difficulty: z.string().default('Medium'),
  rubricCriteria: z.array(z.string()).min(1),
});

const GeneratedQuestionsOutputSchema = z.object({
  companyName: z.string(),
  jobRole: z.string(),
  roundType: z.string(),
  questions: z.array(GeneratedQuestionItemSchema).min(1),
});

const EvaluatedResponseOutputSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string().min(5),
  strengths: z.array(z.string()).default([]),
  improvements: z.array(z.string()).default([]),
  technicalAccuracy: z.number().min(0).max(100).default(75),
  communicationClarity: z.number().min(0).max(100).default(75),
  alignmentWithRole: z.number().min(0).max(100).default(75),
});

const QuestionFeedbackJustificationSchema = z.object({
  questionId: z.string().optional(),
  order: z.number(),
  questionText: z.string(),
  category: z.string().optional(),
  difficulty: z.string().optional(),
  userResponse: z.string(),
  score: z.number(),
  feedback: z.string(),
  expectedCriteria: z.array(z.string()).default([]),
  missedCriteria: z.array(z.string()).default([]),
  strengths: z.array(z.string()).default([]),
  technicalAccuracy: z.number().optional(),
  communicationClarity: z.number().optional(),
});

const FinalFeedbackOutputSchema = z.object({
  summary: z.string().min(10),
  overallScore: z.number().min(0).max(100),
  hiringDecision: z.nativeEnum(HiringDecision),
  strengths: z.array(z.string()).min(1),
  weakAreas: z.array(z.string()).min(1),
  recommendations: z.array(z.string()).min(1),
  categoryBreakdown: z.record(z.string(), z.number()).default({}),
  questionsFeedback: z.array(QuestionFeedbackJustificationSchema).optional(),
});

export class CompanyAiGeneratorService {
  private orchestrator: AIOrchestrator | null = null;

  private getOrchestrator(): AIOrchestrator {
    if (!this.orchestrator) {
      this.orchestrator = new AIOrchestrator(new ProviderFactory());
    }
    return this.orchestrator;
  }

  /**
   * Generates realistic interview questions strictly based on Company, Role, Experience, and Round.
   * INVARIANT: NO Digital Twin context is passed or read.
   */
  public async generateQuestions(params: {
    companyName: string;
    jobRole: string;
    experienceLevel: string;
    roundType: string;
    patternNotes?: string;
    questionsCount?: number;
  }): Promise<GeneratedQuestionsOutput> {
    const { companyName, jobRole, experienceLevel, roundType, patternNotes, questionsCount = 4 } = params;
    const prompt = `You are an elite Senior Technical Hiring Manager and Bar Raiser at ${companyName}.
Your objective is to conduct a realistic, high-fidelity interview simulation for the following position:
- Company: ${companyName}
- Job Role: ${jobRole}
- Experience Level: ${experienceLevel}
- Interview Round: ${roundType}
- Company Hiring Culture & Pattern: ${patternNotes || 'Standard top-tier tech interview bar'}

Task: Generate exactly ${questionsCount} realistic interview questions tailored to ${companyName}'s actual interview style for this specific round.
For each question, specify:
1. "questionText": The exact question as spoken by a seasoned interviewer.
2. "category": The core category/domain (e.g. System Design, Data Structures, Concurrency, Leadership Principles, Architectural Trade-offs).
3. "difficulty": "Easy", "Medium", or "Hard".
4. "rubricCriteria": A list of 3-4 specific expectations that an interviewer evaluates in the answer.

Output format requirement:
Return ONLY a valid JSON object matching this schema:
{
  "companyName": "${companyName}",
  "jobRole": "${jobRole}",
  "roundType": "${roundType}",
  "questions": [
    {
      "questionText": "string",
      "category": "string",
      "difficulty": "string",
      "rubricCriteria": ["string", "string", "string"]
    }
  ]
}`;

    try {
      const response = await this.getOrchestrator().execute<Record<string, unknown>>({
        requestId: randomUUID(),
        task: 'MOCK_INTERVIEW',
        context: {
          companyName,
          jobRole,
          experienceLevel,
          roundType,
        },
        input: { content: prompt },
        options: {
          temperature: 0.6,
          responseSchema: { type: 'object' },
        },
        metadata: { mode: 'COMPANY' },
        timestamp: new Date(),
      });

      const parsed = GeneratedQuestionsOutputSchema.safeParse(response.data);
      if (parsed.success) {
        return parsed.data;
      }
      logger.warn({ issues: parsed.error.issues }, 'Failed to parse AI question output schema, falling back');
    } catch (err) {
      logger.error({ err }, 'Error during AI question generation, using curated fallback questions');
    }

    return this.getFallbackQuestions(companyName, jobRole, experienceLevel, roundType, questionsCount);
  }

  /**
   * Evaluates a single candidate answer against realistic company standards.
   * INVARIANT: NO Digital Twin context is used.
   */
  public async evaluateResponse(params: {
    companyName: string;
    jobRole: string;
    roundType: string;
    questionText: string;
    rubricCriteria?: string[];
    candidateResponse: string;
  }): Promise<EvaluatedResponseOutput> {
    const { companyName, jobRole, roundType, questionText, rubricCriteria, candidateResponse } = params;

    const prompt = `You are a strict technical interviewer at ${companyName} assessing a candidate for a ${jobRole} role during a ${roundType} round.

Question Asked:
"${questionText}"

Evaluation Rubric:
${rubricCriteria ? rubricCriteria.map((c) => `- ${c}`).join('\n') : '- Technical accuracy, structural clarity, depth, and practical trade-offs.'}

Candidate's Answer:
"${candidateResponse}"

Task: Evaluate this answer against ${companyName}'s real-world hiring bar.
Provide:
1. "score": Overall numerical rating from 0 to 100 for this answer.
2. "feedback": 2-3 sentences of direct, candid interviewer feedback.
3. "strengths": 2-3 bullet points of what the candidate did well.
4. "improvements": 2-3 bullet points of what was missing, weak, or inaccurate.
5. "technicalAccuracy": Score 0-100 on correctness and technical depth.
6. "communicationClarity": Score 0-100 on structure, articulation, and concise reasoning.
7. "alignmentWithRole": Score 0-100 on role fit and level calibration.

Output format:
Return ONLY a valid JSON object matching this schema:
{
  "score": number,
  "feedback": "string",
  "strengths": ["string"],
  "improvements": ["string"],
  "technicalAccuracy": number,
  "communicationClarity": number,
  "alignmentWithRole": number
}`;

    try {
      const response = await this.getOrchestrator().execute<Record<string, unknown>>({
        requestId: randomUUID(),
        task: 'MOCK_INTERVIEW',
        context: {
          companyName,
          jobRole,
          roundType,
        },
        input: { content: prompt },
        options: {
          temperature: 0.4,
          responseSchema: { type: 'object' },
        },
        metadata: { mode: 'COMPANY' },
        timestamp: new Date(),
      });

      const parsed = EvaluatedResponseOutputSchema.safeParse(response.data);
      if (parsed.success) {
        return parsed.data;
      }
    } catch (err) {
      logger.error({ err }, 'Error during AI response evaluation, using deterministic evaluator fallback');
    }

    // Deterministic fallback based on answer length and depth
    const wordCount = candidateResponse.trim().split(/\s+/).length;
    const baseScore = Math.min(92, Math.max(45, Math.round(45 + wordCount * 0.45)));

    return {
      score: baseScore,
      feedback: `The response addresses the core prompt with reasonable structure (${wordCount} words provided). To meet the top ${companyName} bar, deepen the discussion of edge cases and architectural trade-offs.`,
      strengths: ['Addressed the main question requirements', 'Demonstrated functional understanding of the domain'],
      improvements: ['Could provide deeper quantitative trade-off analysis', 'State assumptions and edge cases explicitly upfront'],
      technicalAccuracy: baseScore,
      communicationClarity: Math.min(95, baseScore + 5),
      alignmentWithRole: baseScore,
    };
  }

  /**
   * Generates the final round evaluation report, hiring decision, and per-question score justifications.
   * INVARIANT: NO Digital Twin context is used.
   */
  public async generateFinalFeedback(params: {
    companyName: string;
    jobRole: string;
    experienceLevel: string;
    roundType: string;
    qaPairs: Array<{
      questionId?: string;
      question: string;
      category?: string;
      difficulty?: string;
      rubricCriteria?: string[];
      response: string;
      score: number;
      feedback: string;
      strengths?: string[];
      improvements?: string[];
      technicalAccuracy?: number;
      communicationClarity?: number;
    }>;
  }): Promise<FinalFeedbackOutput> {
    const { companyName, jobRole, experienceLevel, roundType, qaPairs } = params;

    const transcriptSummary = qaPairs
      .map(
        (qa, idx) =>
          `Q${idx + 1} (${qa.category || 'General'} - Difficulty: ${qa.difficulty || 'Medium'}): "${qa.question}"
Rubric Expectations: ${qa.rubricCriteria?.join('; ') || 'Standard role accuracy'}
Candidate Answer: "${qa.response}"
Turn Score: ${qa.score}/100
Turn Feedback: ${qa.feedback}
`,
      )
      .join('\n---\n');

    const prompt = `You are the Hiring Committee Lead at ${companyName} reviewing a complete ${roundType} interview packet for a ${experienceLevel} ${jobRole}.

Interview Packet Transcript & Details:
${transcriptSummary}

Task: Produce the final official hiring assessment packet, including a rigorous question-by-question score justification.
Required fields:
1. "overallScore": 0 to 100 calculated average calibrated against the company bar.
2. "hiringDecision": One of "STRONG_HIRE", "HIRE", "LEAN_HIRE", "LEAN_NO_HIRE", "NO_HIRE".
3. "summary": Executive summary of the candidate's performance across the entire round.
4. "strengths": 3-5 key competencies and demonstrated capabilities across the interview.
5. "weakAreas": 2-4 critical gaps, missing nuances, or areas requiring development.
6. "recommendations": 3-4 concrete next steps to reach the top percentile bar for this role.
7. "categoryBreakdown": Key category score mapping (e.g. {"TechnicalDepth": 85, "SystemDesign": 80, "Communication": 90}).
8. "questionsFeedback": An array for every question with:
   - "order": number (1, 2, 3...)
   - "questionText": question text
   - "category": category
   - "userResponse": candidate's answer
   - "score": score 0-100
   - "feedback": detailed justification of why this score was given
   - "expectedCriteria": list of 2-4 key architectural/technical/domain points that ${companyName} looked for
   - "missedCriteria": list of 1-3 specific concepts or edge cases the candidate failed to cover or covered weakly
   - "strengths": list of 1-3 concepts the candidate covered well

Return ONLY a valid JSON object matching this schema:
{
  "summary": "string",
  "overallScore": number,
  "hiringDecision": "HIRE",
  "strengths": ["string"],
  "weakAreas": ["string"],
  "recommendations": ["string"],
  "categoryBreakdown": { "key": number },
  "questionsFeedback": [
    {
      "order": 1,
      "questionText": "string",
      "category": "string",
      "userResponse": "string",
      "score": number,
      "feedback": "string",
      "expectedCriteria": ["string"],
      "missedCriteria": ["string"],
      "strengths": ["string"]
    }
  ]
}`;

    try {
      const response = await this.getOrchestrator().execute<Record<string, unknown>>({
        requestId: randomUUID(),
        task: 'MOCK_INTERVIEW',
        context: {
          companyName,
          jobRole,
          experienceLevel,
          roundType,
        },
        input: { content: prompt },
        options: {
          temperature: 0.4,
          responseSchema: { type: 'object' },
        },
        metadata: { mode: 'COMPANY' },
        timestamp: new Date(),
      });

      const parsed = FinalFeedbackOutputSchema.safeParse(response.data);
      if (parsed.success) {
        // Ensure questionIds are attached if missing
        if (parsed.data.questionsFeedback) {
          parsed.data.questionsFeedback = parsed.data.questionsFeedback.map((qf, i) => ({
            ...qf,
            questionId: qaPairs[i]?.questionId || qf.questionId,
          }));
        }
        return parsed.data;
      }
    } catch (err) {
      logger.error({ err }, 'Error during AI final feedback generation, using rubric fallback');
    }

    // Deterministic fallback report
    const scores = qaPairs.map((qa) => qa.score);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 75;

    let decision: HiringDecision = HiringDecision.LEAN_HIRE;
    if (avgScore >= 88) decision = HiringDecision.STRONG_HIRE;
    else if (avgScore >= 78) decision = HiringDecision.HIRE;
    else if (avgScore >= 68) decision = HiringDecision.LEAN_HIRE;
    else if (avgScore >= 55) decision = HiringDecision.LEAN_NO_HIRE;
    else decision = HiringDecision.NO_HIRE;

    const fallbackQuestionsFeedback: QuestionFeedbackJustification[] = qaPairs.map((qa, idx) => ({
      questionId: qa.questionId,
      order: idx + 1,
      questionText: qa.question,
      category: qa.category || 'General Technical',
      difficulty: qa.difficulty || 'Medium',
      userResponse: qa.response,
      score: qa.score,
      feedback: qa.feedback || `Evaluated on ${companyName} standards with score ${qa.score}/100.`,
      expectedCriteria: qa.rubricCriteria || [
        'Detailed architectural components and clear data flow',
        'Time and space complexity tradeoffs with edge cases',
        'Scalability, partitioning, and fault tolerance handling',
      ],
      missedCriteria: qa.improvements && qa.improvements.length > 0 ? qa.improvements : [
        'Deeper quantitative trade-off analysis',
        'Explicit consideration of high-scale bottlenecks and edge cases',
      ],
      strengths: qa.strengths && qa.strengths.length > 0 ? qa.strengths : [
        'Addressed the main question requirements with structured flow',
      ],
      technicalAccuracy: qa.technicalAccuracy || qa.score,
      communicationClarity: qa.communicationClarity || Math.min(100, qa.score + 5),
    }));

    return {
      summary: `The candidate completed the ${companyName} ${roundType} interview simulation with an average score of ${avgScore}/100. Demonstrated solid domain fundamentals with clear areas for higher-level optimization.`,
      overallScore: avgScore,
      hiringDecision: decision,
      strengths: [
        'Structured analytical problem-solving approach',
        'Clear communicative articulation of technical concepts',
        'Sound foundational knowledge of the role domain',
      ],
      weakAreas: [
        'Exploration of high-scale bottlenecks and edge cases under pressure',
        'Proactive calculation of concrete resource sizing and time/space constraints',
      ],
      recommendations: [
        'Practice timed mock problems under strict 20-minute constraints',
        'Review standard distributed systems and high-throughput architectural patterns',
        'Formulate answers using the STAR method for behavioral and scenario-based queries',
      ],
      categoryBreakdown: {
        'Technical Accuracy': avgScore,
        'Problem Solving': Math.min(100, avgScore + 4),
        'Communication & Delivery': Math.min(100, avgScore + 2),
        'System & Architecture': Math.max(50, avgScore - 4),
      },
      questionsFeedback: fallbackQuestionsFeedback,
    };
  }

  /**
   * Fallback curated question bank when offline or if provider is unavailable.
   */
  private getFallbackQuestions(
    companyName: string,
    jobRole: string,
    experienceLevel: string,
    roundType: string,
    count: number,
  ): GeneratedQuestionsOutput {
    const questionBank: Record<string, GeneratedQuestionItem[]> = {
      CODING_ALGORITHMS: [
        {
          questionText: `Design and implement an efficient algorithm to find the Longest Substring Without Repeating Characters in a given stream of text. Explain your time and space complexity.`,
          category: 'Algorithms & Strings',
          difficulty: 'Medium',
          rubricCriteria: ['Optimal sliding window technique O(N)', 'Hash map/set tracking', 'Space complexity O(min(m,n))', 'Edge cases (empty string, all identical characters)'],
        },
        {
          questionText: `Given a large directed graph representing microservice dependency chains at ${companyName}, how would you detect cycles and produce a valid topological deployment order?`,
          category: 'Graph Algorithms & DFS',
          difficulty: 'Medium',
          rubricCriteria: ['Kahn\'s algorithm or DFS with 3-color states', 'Cycle detection handling', 'Time complexity O(V+E)', 'Clear explanation of recursion/stack safety'],
        },
        {
          questionText: `Given an array of integers representing request latencies, design an algorithm to find the median latency in a dynamic data stream efficiently.`,
          category: 'Heaps & Data Streams',
          difficulty: 'Hard',
          rubricCriteria: ['Two heaps approach (max-heap + min-heap)', 'O(log N) insertion and O(1) retrieval', 'Rebalancing logic', 'Handling even vs odd elements'],
        },
        {
          questionText: `You are asked to optimize memory for caching millions of key-value records. Implement an LRU (Least Recently Used) Cache with O(1) get and O(1) put operations.`,
          category: 'System Data Structures',
          difficulty: 'Medium',
          rubricCriteria: ['Doubly linked list + Hash Map', 'O(1) node eviction and insertion', 'Thread safety considerations', 'Handling capacity limits'],
        },
      ],
      SYSTEM_DESIGN: [
        {
          questionText: `Design a globally distributed URL shortening service (like Bit.ly or ${companyName}'s internal redirection service) handling 500 million new URLs per month and 100x read traffic.`,
          category: 'High-Scale Distributed Systems',
          difficulty: 'Medium',
          rubricCriteria: ['API endpoints & Base62 encoding strategy', 'Database schema & NoSQL vs SQL trade-offs', 'Caching layer with Redis/Memcached', 'Global replication & collision resolution'],
        },
        {
          questionText: `How would you architect a real-time notification service at ${companyName} capable of pushing billions of multi-channel notifications (Push, SMS, Email) with strict at-least-once delivery?`,
          category: 'Message Queues & Streaming',
          difficulty: 'Hard',
          rubricCriteria: ['Distributed message bus (Kafka/RabbitMQ)', 'Worker queue rate limiting & idempotency', 'Handling provider outages with DLQs', 'User preference filtering'],
        },
        {
          questionText: `Design a distributed rate limiter that protects ${companyName}'s public API gateways from DDoS attacks and abuse across multiple regions with minimal latency overhead.`,
          category: 'API Gateway & Security',
          difficulty: 'Medium',
          rubricCriteria: ['Token Bucket or Sliding Window Log algorithm', 'Centralized Redis vs localized memory trade-offs', 'Clock skew & race condition handling', 'Graceful 429 response degradation'],
        },
        {
          questionText: `Design a real-time collaborative document editing system (similar to Google Docs) allowing multiple users to edit simultaneously with sub-50ms conflict resolution.`,
          category: 'Concurrency & CRDTs',
          difficulty: 'Hard',
          rubricCriteria: ['Operational Transformation (OT) vs CRDTs', 'WebSocket connection management', 'Snapshotting & version history compaction', 'Offline sync and reconnection logic'],
        },
      ],
      BEHAVIORAL_LEADERSHIP: [
        {
          questionText: `Tell me about a time at work where you faced a significant technical disagreement with a team member or senior engineer. How did you handle the situation and what was the outcome?`,
          category: 'Disagreement & Collaboration',
          difficulty: 'Medium',
          rubricCriteria: ['STAR method structure', 'Focus on data and user benefit over ego', 'Constructive consensus building', 'Reflection on lessons learned'],
        },
        {
          questionText: `Describe a situation where a critical production outage occurred under your watch. Walk me through how you diagnosed it, communicated with stakeholders, and prevented future recurrences.`,
          category: 'Incident Management & Ownership',
          difficulty: 'Medium',
          rubricCriteria: ['Root-cause analysis methodology', 'Immediate mitigation vs long-term fix', 'Blameless post-mortem culture', 'Automated regression prevention'],
        },
        {
          questionText: `Give an example of a project where requirements were vague or rapidly changing. How did you prioritize deliverables and maintain team velocity?`,
          category: 'Navigating Ambiguity',
          difficulty: 'Medium',
          rubricCriteria: ['Proactive clarification with product/stakeholders', 'Iterative milestone breakdown', 'Risk mitigation', 'Clear communication of trade-offs'],
        },
        {
          questionText: `Why do you want to join ${companyName} specifically for the ${jobRole} position, and what unique technical or leadership impact do you aim to bring to the organization?`,
          category: 'Motivation & Role Alignment',
          difficulty: 'Medium',
          rubricCriteria: ['Knowledge of company mission and engineering culture', 'Specific technical passions aligned with the role', 'Clear career progression narrative'],
        },
      ],
      TECHNICAL_SCREEN: [
        {
          questionText: `Explain the internal workings of the Event Loop in JavaScript / Node.js (or runtime thread pooling in your primary backend language), including microtasks vs macrotasks.`,
          category: 'Runtime Architecture',
          difficulty: 'Medium',
          rubricCriteria: ['Call stack, Task Queue, Microtask Queue order', 'I/O polling lifecycle', 'Non-blocking I/O execution', 'Common pitfalls (CPU-bound blocking)'],
        },
        {
          questionText: `Compare relational databases (PostgreSQL/MySQL) with document stores (MongoDB) for transactional consistency vs horizontal scalability. When would you choose one over the other at ${companyName}?`,
          category: 'Databases & Storage',
          difficulty: 'Medium',
          rubricCriteria: ['ACID vs BASE properties', 'CAP theorem trade-offs', 'Indexing strategies (B-Tree vs Hash)', 'Schema evolution & migration considerations'],
        },
        {
          questionText: `How does HTTPS establish a secure session between a client and server? Walk through the TLS 1.3 handshake step by step.`,
          category: 'Networking & Security',
          difficulty: 'Medium',
          rubricCriteria: ['Asymmetric vs Symmetric encryption', 'Certificate validation & CA trust chain', 'Diffie-Hellman key exchange', 'Performance optimizations in TLS 1.3'],
        },
        {
          questionText: `What are the key architectural differences between REST, GraphQL, and gRPC? For what use case would you choose each at ${companyName}?`,
          category: 'API Protocols & Architecture',
          difficulty: 'Medium',
          rubricCriteria: ['Over-fetching/under-fetching dynamics', 'Binary Protobuf serialization vs JSON', 'Streaming capabilities (HTTP/2 multiplexing)', 'Caching and tooling trade-offs'],
        },
      ],
      DOMAIN_DEEP_DIVE: [
        {
          questionText: `Walk me through how modern web browsers render a complex web page from initial HTML bytes to paint, and how you optimize Core Web Vitals (LCP, INP, CLS) in a large SPA.`,
          category: 'Web Performance & Rendering',
          difficulty: 'Medium',
          rubricCriteria: ['DOM/CSSOM tree construction & Render tree', 'Layout, Paint, and Composite pipeline', 'Code splitting and bundle optimization', 'Hydration and INP optimization techniques'],
        },
        {
          questionText: `Explain state management patterns in complex frontend applications. How do you decide between local state, server state (e.g. TanStack Query), and global client state?`,
          category: 'Frontend State Architecture',
          difficulty: 'Medium',
          rubricCriteria: ['Server-state caching vs ephemeral UI state', 'Immutability and reactivity models', 'Preventing unnecessary re-renders', 'State normalization'],
        },
        {
          questionText: `How do you design a robust CI/CD pipeline with automated testing, zero-downtime blue/green or canary deployments, and automated rollbacks for microservices?`,
          category: 'DevOps & Reliability',
          difficulty: 'Medium',
          rubricCriteria: ['Automated test stages (Unit, Integration, E2E)', 'Canary traffic shifting (Istio/Envoy)', 'Health check & telemetry-driven rollbacks', 'Database migration safety (expand/contract pattern)'],
        },
        {
          questionText: `How do you secure modern cloud-native applications against top OWASP vulnerabilities (e.g., SQL/NoSQL Injection, SSRF, Broken Access Control, XSS)?`,
          category: 'Application Security',
          difficulty: 'Medium',
          rubricCriteria: ['Input sanitization & parameterized queries', 'Context-aware output encoding & CSP', 'Least-privilege RBAC/ABAC enforcement', 'SSRF egress filtering & metadata protections'],
        },
      ],
    };

    const roundKey = roundType in questionBank ? roundType : 'TECHNICAL_SCREEN';
    const pool = questionBank[roundKey] || questionBank['TECHNICAL_SCREEN'];
    const selected = pool.slice(0, Math.min(count, pool.length));

    return {
      companyName,
      jobRole,
      roundType,
      questions: selected,
    };
  }
}
