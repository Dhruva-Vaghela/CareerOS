import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { AIOrchestrator, ProviderFactory } from '@careeros/ai-client';
import { NodeType } from '@careeros/shared-types';
import { createLogger } from '@careeros/logger';

import '../config.js';

const logger = createLogger('roadmap-ai-generator');

export interface GeneratedChecklistItem {
  title: string;
  description: string;
  resourceTitle?: string;
  resourceUrl?: string;
  resourceType?: string;
}

export interface GeneratedSubtopic {
  title: string;
  type: NodeType;
  checklistItems: GeneratedChecklistItem[];
}

export interface GeneratedTopic {
  title: string;
  description?: string;
  type: NodeType;
  subtopics: GeneratedSubtopic[];
}

export interface GeneratedModule {
  title: string;
  description: string;
  type: NodeType;
  estimatedHours: number;
  topics: GeneratedTopic[];
}

export interface GeneratedRoadmapOutput {
  targetRole: string;
  modules: GeneratedModule[];
}

// Zod schema for structured output validation
const GeneratedChecklistSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  resourceTitle: z.string().optional(),
  resourceUrl: z.string().optional(),
  resourceType: z.string().optional(),
});

const GeneratedSubtopicSchema = z.object({
  title: z.string().min(1),
  type: z.nativeEnum(NodeType).default(NodeType.MANDATORY),
  checklistItems: z.array(GeneratedChecklistSchema).min(1),
});

const GeneratedTopicSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.nativeEnum(NodeType).default(NodeType.MANDATORY),
  subtopics: z.array(GeneratedSubtopicSchema).min(1),
});

const GeneratedModuleSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(''),
  type: z.nativeEnum(NodeType).default(NodeType.MANDATORY),
  estimatedHours: z.number().positive().default(15),
  topics: z.array(GeneratedTopicSchema).min(1),
});

export const GeneratedRoadmapSchema = z.object({
  targetRole: z.string().min(1),
  modules: z.array(GeneratedModuleSchema).min(1),
});

export interface RoadmapGenerationInput {
  userId: string;
  targetRole: string;
  targetCompanies?: string[];
  targetTimeline?: string;
  experienceLevel?: string;
  currentSkills?: string[];
  background?: string;
  previousModuleTitles?: string[];
}

export class AIGeneratorService {
  private orchestrator: AIOrchestrator | null = null;

  private getOrchestrator(): AIOrchestrator {
    if (!this.orchestrator) {
      this.orchestrator = new AIOrchestrator(new ProviderFactory());
    }
    return this.orchestrator;
  }

  public async generateRoadmap(input: RoadmapGenerationInput): Promise<GeneratedRoadmapOutput> {
    logger.info({ userId: input.userId, targetRole: input.targetRole }, 'Initiating AI roadmap generation');

    const prompt = this.buildPrompt(input);

    try {
      const response = await this.getOrchestrator().execute<Record<string, unknown>>({
        requestId: randomUUID(),
        task: 'ROADMAP_GENERATION',
        context: {
          targetRole: input.targetRole,
          timeline: input.targetTimeline || '6 Months',
          experienceLevel: input.experienceLevel || 'BEGINNER',
          skills: input.currentSkills || [],
          companies: input.targetCompanies || [],
        },
        input: { content: prompt },
        options: {
          temperature: input.previousModuleTitles?.length ? 0.7 : 0.3,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseSchema: { type: 'object' },
        },
        metadata: { userId: input.userId },
        timestamp: new Date(),
      });

      if (response.success && response.data) {
        const parsed = this.parseAndValidate(response.data, input.targetRole);
        if (parsed) {
          logger.info({ userId: input.userId, modulesCount: parsed.modules.length }, 'AI successfully generated roadmap');
          return parsed;
        }
      }

      logger.warn({ userId: input.userId }, 'AI generation returned incomplete or unparseable data. Using curriculum fallback.');
      return this.getFallbackRoadmap(input);
    } catch (err) {
      logger.error({ err, userId: input.userId }, 'AI generation error encountered. Falling back to deterministic curriculum.');
      return this.getFallbackRoadmap(input);
    }
  }

  private buildPrompt(input: RoadmapGenerationInput): string {
    const regenerationGuidance = input.previousModuleTitles?.length
      ? `This is a fresh alternative roadmap for the same target role. Keep the role and core prerequisites, but make the learning path meaningfully different. Avoid reusing these previous module titles: ${JSON.stringify(input.previousModuleTitles)}.`
      : '';

    return `
You are the CareerOS AI Senior Curriculum Architect.
Generate a structured, rigorous, and highly actionable learning roadmap for target role: "${input.targetRole}".

User Profile:
- Target Role: ${input.targetRole}
- Target Timeline: ${input.targetTimeline || '6 Months'}
- Experience Level: ${input.experienceLevel || 'Beginner to Intermediate'}
- Target Companies: ${input.targetCompanies?.join(', ') || 'Top Tech & Startups'}
- Current Known Skills: ${input.currentSkills?.join(', ') || 'Foundational Programming'}

${regenerationGuidance}

Requirements:
1. Provide between 3 and 5 sequential Modules.
2. Categorize each Module, Topic, and Subtopic as either "MANDATORY", "RECOMMENDED", or "OPTIONAL".
3. Every Module must contain 2 Topics.
4. Every Topic must contain 1 Subtopic.
5. Every Subtopic must contain 1 to 2 concrete Checklist Items. Each Checklist Item MUST be an actionable learning task with a title and clear description.
6. Provide resourceTitle (e.g. "Official Docs", "MDN Reference", "Interactive Tutorial") and resourceType ("DOCUMENTATION" | "VIDEO" | "EXERCISE").

Output MUST be strictly valid JSON matching this schema:
{
  "targetRole": "${input.targetRole}",
  "modules": [
    {
      "title": "Module Title",
      "description": "Module overview",
      "type": "MANDATORY",
      "estimatedHours": 15,
      "topics": [
        {
          "title": "Topic Title",
          "description": "Topic description",
          "type": "MANDATORY",
          "subtopics": [
            {
              "title": "Subtopic Title",
              "type": "MANDATORY",
              "checklistItems": [
                {
                  "title": "Actionable task",
                  "description": "Task guidance",
                  "resourceTitle": "Resource name",
                  "resourceUrl": "https://example.com",
                  "resourceType": "DOCUMENTATION"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
`.trim();
  }

  private parseAndValidate(raw: unknown, targetRole: string): GeneratedRoadmapOutput | null {
    try {
      let dataToParse = raw;
      if (typeof raw === 'string') {
        let cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
        dataToParse = JSON.parse(cleaned);
      }

      if (dataToParse && typeof dataToParse === 'object' && !('targetRole' in dataToParse)) {
        (dataToParse as Record<string, unknown>).targetRole = targetRole;
      }

      const result = GeneratedRoadmapSchema.safeParse(dataToParse);
      if (result.success) {
        return result.data as GeneratedRoadmapOutput;
      }
      logger.warn({ errors: result.error.errors }, 'Schema validation failed for AI roadmap');
      return null;
    } catch (err) {
      logger.warn({ err }, 'Failed to parse AI output into JSON');
      return null;
    }
  }

  public getFallbackRoadmap(
    input: RoadmapGenerationInput
  ): GeneratedRoadmapOutput {
    const role = input.targetRole.toLowerCase().trim();

    if (
      role.includes('cyber') ||
      role.includes('security') ||
      role.includes('soc') ||
      role.includes('pentest') ||
      role.includes('infosec')
    ) {
      return this.getCybersecurityFallback(input.targetRole);
    }

    if (
      role.includes('devops') ||
      role.includes('sre') ||
      role.includes('site reliability') ||
      role.includes('platform') ||
      role.includes('ci/cd')
    ) {
      return this.getDevOpsFallback(input.targetRole);
    }

    if (
      role.includes('cloud') ||
      role.includes('aws') ||
      role.includes('azure') ||
      role.includes('gcp')
    ) {
      return this.getCloudFallback(input.targetRole);
    }

    if (
      role.includes('frontend') ||
      role.includes('react') ||
      role.includes('vue') ||
      role.includes('web design')
    ) {
      return this.getFrontendFallback(input.targetRole);
    }

    if (
      role.includes('ui/ux') ||
      role.includes('ui ux') ||
      role.includes('ux designer') ||
      role.includes('ui designer')
    ) {
      return this.getUIUXFallback(input.targetRole);
    }

    if (
      role.includes('backend') ||
      role.includes('node') ||
      role.includes('database') ||
      role.includes('golang') ||
      role.includes('api')
    ) {
      return this.getBackendFallback(input.targetRole);
    }

    if (role.includes('ai engineer')) {
      return this.getAIFallback(input.targetRole);
    }

    if (role.includes('machine learning engineer') || role.includes('ml engineer')) {
      return this.getMachineLearningFallback(input.targetRole);
    }

    if (role.includes('data scientist')) {
      return this.getDataScientistFallback(input.targetRole);
    }

    if (role.includes('data analyst')) {
      return this.getDataAnalystFallback(input.targetRole);
    }

    if (role.includes('software engineer')) {
      return this.getSoftwareEngineerFallback(input.targetRole);
    }

    if (role.includes('full stack')) {
      return this.getFullStackFallback(input.targetRole);
    }

    if (role.includes('product manager')) {
      return this.getProductManagerFallback(input.targetRole);
    }

    if (role.includes('business analyst')) {
      return this.getBusinessAnalystFallback(input.targetRole);
    }

    // "Other" or unknown roles
    return this.getGenericCareerFallback(input.targetRole);
  }

  private getFullStackFallback(targetRole: string): GeneratedRoadmapOutput {
    return {
      targetRole,
      modules: [
        {
          title: 'Core Computer Science & Modern JavaScript/TypeScript',
          description: 'Master core language semantics, asynchronous patterns, and strict typing foundations.',
          type: NodeType.MANDATORY,
          estimatedHours: 20,
          topics: [
            {
              title: 'Advanced JavaScript Engine & Async Event Loop',
              description: 'Deep dive into closures, prototypes, event loop, and microtask queues.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Asynchronous Programming & Memory Management',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Master Promises, async/await, and Promise.allSettled',
                      description: 'Implement robust error-handled async pipelines and race condition guards.',
                      resourceTitle: 'MDN Async JavaScript',
                      resourceUrl: 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous',
                      resourceType: 'DOCUMENTATION',
                    },
                    {
                      title: 'Event Loop & Execution Context Internals',
                      description: 'Analyze call stack, macrotasks vs microtasks, and garbage collection mechanisms.',
                      resourceTitle: 'JavaScript.info Event Loop',
                      resourceUrl: 'https://javascript.info/event-loop',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
            {
              title: 'Production TypeScript & Type Systems',
              description: 'Generics, conditional types, utility types, and strict compilation flags.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Type Safety & Domain Modeling',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Build strict domain models with Discriminated Unions',
                      description: 'Avoid any and unknown; model business states with exhaustive type narrowing.',
                      resourceTitle: 'TypeScript Handbook',
                      resourceUrl: 'https://www.typescriptlang.org/docs/handbook/2/narrowing.html',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Modern Frontend Architecture with React',
          description: 'Component lifecycles, state management, hooks, and clean client architecture.',
          type: NodeType.MANDATORY,
          estimatedHours: 25,
          topics: [
            {
              title: 'React Core & Custom Hooks Design',
              description: 'Virtual DOM, reconciliation, hook rules, and performance optimizations.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Hooks Architecture & Memoization',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Implement reusable custom hooks with useMemo and useCallback',
                      description: 'Profile component render cycles using React DevTools and avoid unnecessary re-renders.',
                      resourceTitle: 'React Documentation',
                      resourceUrl: 'https://react.dev/learn/reusing-logic-with-custom-hooks',
                      resourceType: 'DOCUMENTATION',
                    },
                    {
                      title: 'Global State Management & Context API',
                      description: 'Architect decoupled state layers with Context, Zustand, or TanStack Query.',
                      resourceTitle: 'Zustand State Guide',
                      resourceUrl: 'https://zustand.docs.pmnd.rs/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Scalable Backend Services & REST APIs with Node.js',
          description: 'Building resilient API servers with Express/Fastify, middleware pipelines, and validation.',
          type: NodeType.MANDATORY,
          estimatedHours: 25,
          topics: [
            {
              title: 'RESTful Architecture & Middleware Design',
              description: 'Routing, error propagation, authentication middleware, and input sanitization.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Production Express & Zod Validation',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Implement centralized validation middleware with Zod',
                      description: 'Ensure incoming request bodies, params, and headers conform to strict schemas.',
                      resourceTitle: 'Zod Official Guide',
                      resourceUrl: 'https://zod.dev',
                      resourceType: 'DOCUMENTATION',
                    },
                    {
                      title: 'JWT Authentication & Refresh Token Rotation',
                      description: 'Implement secure cookie/header session verification and token revocation.',
                      resourceTitle: 'OWASP Authentication Cheatsheet',
                      resourceUrl: 'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Databases, Schemas & Persistence (MongoDB / PostgreSQL)',
          description: 'Data modeling, indexes, ACID transactions, and query optimization.',
          type: NodeType.RECOMMENDED,
          estimatedHours: 20,
          topics: [
            {
              title: 'Document Modeling & Indexing with Mongoose',
              description: 'Schema constraints, compound indexes, aggregation pipelines, and transactions.',
              type: NodeType.RECOMMENDED,
              subtopics: [
                {
                  title: 'Database Performance & Queries',
                  type: NodeType.RECOMMENDED,
                  checklistItems: [
                    {
                      title: 'Design compound indexes and analyze explain plans',
                      description: 'Eliminate COLLSCANs and ensure sub-10ms query execution times.',
                      resourceTitle: 'MongoDB Indexing Documentation',
                      resourceUrl: 'https://www.mongodb.com/docs/manual/indexes/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'System Design, Microservices & Event-Driven Patterns',
          description: 'Decoupled services, event bus architecture, caching with Redis, and CI/CD pipelines.',
          type: NodeType.OPTIONAL,
          estimatedHours: 15,
          topics: [
            {
              title: 'Event-Driven Architectures & Reliability',
              description: 'Pub/sub mechanisms, idempotency keys, and circuit breakers.',
              type: NodeType.OPTIONAL,
              subtopics: [
                {
                  title: 'Asynchronous Event Contracts',
                  type: NodeType.OPTIONAL,
                  checklistItems: [
                    {
                      title: 'Implement idempotent event consumers and retry dead-letter queues',
                      description: 'Guarantee message delivery without duplicate side-effects.',
                      resourceTitle: 'Enterprise Integration Patterns',
                      resourceUrl: 'https://www.enterpriseintegrationpatterns.com',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
  }

  private getFrontendFallback(targetRole: string): GeneratedRoadmapOutput {
    return {
      targetRole,
      modules: [
        {
          title: 'Modern HTML5, Semantic Web & Advanced CSS',
          description: 'Accessibility (a11y), responsive layouts with Flexbox and Grid, CSS variables, and modern styling.',
          type: NodeType.MANDATORY,
          estimatedHours: 15,
          topics: [
            {
              title: 'Semantic HTML & Web Accessibility Standards',
              description: 'ARIA roles, keyboard navigability, and screen reader compliance.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'WCAG 2.1 Guidelines Implementation',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Audit and achieve 100% Lighthouse Accessibility score',
                      description: 'Ensure color contrast, semantic landmarks, and alt tags conform to standards.',
                      resourceTitle: 'WebAIM WCAG Checklist',
                      resourceUrl: 'https://webaim.org/standards/wcag/checklist',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Advanced React, State Management & Performance',
          description: 'React 18 concurrent features, custom hooks, render optimization, and state architectures.',
          type: NodeType.MANDATORY,
          estimatedHours: 25,
          topics: [
            {
              title: 'React Internals & Rendering Pipelines',
              description: 'Fiber reconciliation, Suspense, transitions, and memory leak prevention.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Render Optimization & Virtualization',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Implement virtualized lists for large datasets (TanStack Virtual)',
                      description: 'Render thousands of elements smoothly at 60fps without DOM bloat.',
                      resourceTitle: 'TanStack Virtual Documentation',
                      resourceUrl: 'https://tanstack.com/virtual/latest',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Automated Testing, CI & Build Tooling',
          description: 'Vitest, React Testing Library, Playwright E2E, Vite bundler optimization.',
          type: NodeType.RECOMMENDED,
          estimatedHours: 20,
          topics: [
            {
              title: 'Unit, Integration & Component Testing',
              description: 'Testing user interactions, mocking API calls, and code coverage.',
              type: NodeType.RECOMMENDED,
              subtopics: [
                {
                  title: 'React Testing Library Best Practices',
                  type: NodeType.RECOMMENDED,
                  checklistItems: [
                    {
                      title: 'Write user-centric component tests mocking network requests with MSW',
                      description: 'Avoid testing implementation details; test behaviors matching real user flows.',
                      resourceTitle: 'Testing Library Docs',
                      resourceUrl: 'https://testing-library.com/docs/react-testing-library/intro/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Micro-Frontends & Advanced Web Performance',
          description: 'Core Web Vitals, code splitting, edge rendering, and progressive web apps.',
          type: NodeType.OPTIONAL,
          estimatedHours: 15,
          topics: [
            {
              title: 'Core Web Vitals Optimization',
              description: 'Minimizing LCP, INP, and CLS scores across desktop and mobile.',
              type: NodeType.OPTIONAL,
              subtopics: [
                {
                  title: 'Asset Loading & Edge CDN Caching',
                  type: NodeType.OPTIONAL,
                  checklistItems: [
                    {
                      title: 'Optimize image and font delivery with modern formats (AVIF, WOFF2)',
                      description: 'Implement preconnect and resource hints for critical render path.',
                      resourceTitle: 'web.dev Performance Guide',
                      resourceUrl: 'https://web.dev/explore/fast',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
  }

  private getBackendFallback(targetRole: string): GeneratedRoadmapOutput {
    return {
      targetRole,
      modules: [
        {
          title: 'Backend Core Runtime & Concurrency with Node.js',
          description: 'Node.js event loop, streams, buffers, child processes, and asynchronous architectures.',
          type: NodeType.MANDATORY,
          estimatedHours: 20,
          topics: [
            {
              title: 'Streams, Buffers & Memory Efficiency',
              description: 'Streaming large datasets without exceeding process heap limits.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Node.js Stream Pipelines',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Build backpressure-aware stream transformation pipelines',
                      description: 'Handle gigabyte-scale data ingestion smoothly using stream.pipeline().',
                      resourceTitle: 'Node.js Streams Guide',
                      resourceUrl: 'https://nodejs.org/api/stream.html',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'API Design, Security & Microservices Communication',
          description: 'RESTful guidelines, gRPC, OAuth2/JWT security, rate limiting, and CORS policies.',
          type: NodeType.MANDATORY,
          estimatedHours: 25,
          topics: [
            {
              title: 'API Gateway & Security Hardening',
              description: 'Centralized rate limiting, helmet headers, request ID tracking, and sanitization.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Defensive API Engineering',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Implement token bucket rate limiting and SQL/NoSQL injection guards',
                      description: 'Protect all public endpoints from brute-force and volumetric denial of service.',
                      resourceTitle: 'OWASP API Security Top 10',
                      resourceUrl: 'https://owasp.org/www-project-api-security/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Distributed Systems & Message Brokers (Kafka / RabbitMQ)',
          description: 'Event-driven architectures, pub/sub, consumer groups, partition keys, and idempotency.',
          type: NodeType.RECOMMENDED,
          estimatedHours: 20,
          topics: [
            {
              title: 'Asynchronous Messaging Patterns',
              description: 'Decoupled inter-service communication and outbox patterns.',
              type: NodeType.RECOMMENDED,
              subtopics: [
                {
                  title: 'Transactional Outbox & Idempotent Handlers',
                  type: NodeType.RECOMMENDED,
                  checklistItems: [
                    {
                      title: 'Implement the Transactional Outbox pattern with MongoDB/Postgres',
                      description: 'Guarantee dual-write consistency between database commits and message publication.',
                      resourceTitle: 'Microservices.io Outbox Pattern',
                      resourceUrl: 'https://microservices.io/patterns/data/transactional-outbox.html',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Cloud Infrastructure, Containers & Kubernetes',
          description: 'Docker containerization, Docker Compose, Kubernetes pods/services, and monitoring.',
          type: NodeType.OPTIONAL,
          estimatedHours: 15,
          topics: [
            {
              title: 'Containerization & Observability',
              description: 'Multi-stage Docker builds, health probes, Prometheus metrics, and structured logs.',
              type: NodeType.OPTIONAL,
              subtopics: [
                {
                  title: 'Production Docker Containers',
                  type: NodeType.OPTIONAL,
                  checklistItems: [
                    {
                      title: 'Write optimized non-root Alpine multi-stage Dockerfiles',
                      description: 'Minimize final image footprint and eliminate common CVE attack vectors.',
                      resourceTitle: 'Docker Best Practices',
                      resourceUrl: 'https://docs.docker.com/develop/develop-images/dockerfile_best-practices/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
  }

  private getAIFallback(targetRole: string): GeneratedRoadmapOutput {
    return {
      targetRole,
      modules: [
        {
          title: 'Python, Math & Machine Learning Foundations',
          description: 'Linear algebra, calculus, NumPy, Pandas, scikit-learn, and exploratory data analysis.',
          type: NodeType.MANDATORY,
          estimatedHours: 25,
          topics: [
            {
              title: 'Data Manipulation & Classical ML Algorithms',
              description: 'Supervised vs unsupervised learning, regression, classification, cross-validation.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Model Evaluation & Overfitting Prevention',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Implement cross-validation pipelines with Scikit-learn',
                      description: 'Calculate precision, recall, F1 score, and ROC-AUC curves on imbalanced datasets.',
                      resourceTitle: 'Scikit-Learn Model Evaluation',
                      resourceUrl: 'https://scikit-learn.org/stable/modules/model_evaluation.html',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Deep Learning & Neural Architectures (PyTorch / TensorFlow)',
          description: 'Tensors, backpropagation, CNNs, RNNs, and Transformer self-attention mechanisms.',
          type: NodeType.MANDATORY,
          estimatedHours: 30,
          topics: [
            {
              title: 'Transformer Architecture & Attention Mechanisms',
              description: 'Multi-head attention, positional encodings, encoder-decoder networks, and BERT/GPT foundations.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Transformer Implementation in PyTorch',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Build self-attention mechanism from scratch using PyTorch tensors',
                      description: 'Understand query, key, value matrix computations and scaled dot-product attention.',
                      resourceTitle: 'The Illustrated Transformer',
                      resourceUrl: 'https://jalammar.github.io/illustrated-transformer/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'LLMs, Prompt Engineering, LangChain & RAG Systems',
          description: 'Vector databases (Pinecone, Chroma), semantic search, embeddings, and retrieval-augmented generation.',
          type: NodeType.RECOMMENDED,
          estimatedHours: 25,
          topics: [
            {
              title: 'Retrieval-Augmented Generation (RAG) Architecture',
              description: 'Chunking strategies, embedding models, vector indexing, and grounded context synthesis.',
              type: NodeType.RECOMMENDED,
              subtopics: [
                {
                  title: 'Production RAG Pipeline',
                  type: NodeType.RECOMMENDED,
                  checklistItems: [
                    {
                      title: 'Build a production document Q&A pipeline with semantic caching',
                      description: 'Integrate hybrid keyword + vector retrieval and measure hallucination rates.',
                      resourceTitle: 'LangChain RAG Tutorial',
                      resourceUrl: 'https://python.langchain.com/docs/tutorials/rag/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'MLOps, Model Serving & Scalable Inference',
          description: 'FastAPI, vLLM, TensorRT-LLM, model quantizations (GGUF, AWQ), Docker, and monitoring.',
          type: NodeType.OPTIONAL,
          estimatedHours: 20,
          topics: [
            {
              title: 'High-Throughput Model Serving',
              description: 'Dynamic batching, PagedAttention, and streaming server-sent events.',
              type: NodeType.OPTIONAL,
              subtopics: [
                {
                  title: 'Optimized LLM Inference Service',
                  type: NodeType.OPTIONAL,
                  checklistItems: [
                    {
                      title: 'Deploy an inference service with vLLM and stream responses to web clients',
                      description: 'Measure time-to-first-token (TTFT) and tokens-per-second throughput under load.',
                      resourceTitle: 'vLLM Documentation',
                      resourceUrl: 'https://docs.vllm.ai/en/latest/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
  }

  private getCybersecurityFallback(targetRole: string): GeneratedRoadmapOutput {
    return {
      targetRole,
      modules: [
        {
          title: 'Computer Networking, Protocols & Linux System Security',
          description: 'Deep understanding of TCP/IP, OSI model, packet analysis, Linux kernel security, and permissions.',
          type: NodeType.MANDATORY,
          estimatedHours: 25,
          topics: [
            {
              title: 'Network Protocols & Packet Inspection',
              description: 'Wireshark, tcpdump, DNS/DHCP security, ARP poisoning, and TLS 1.3 handshake mechanics.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Packet Analysis & Traffic Forensics',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Analyze malicious PCAP captures with Wireshark and filter malicious streams',
                      description: 'Identify unencrypted credentials, DNS tunneling, and port scans in network traces.',
                      resourceTitle: 'Wireshark User Guide',
                      resourceUrl: 'https://www.wireshark.org/docs/wsug_html_chunked/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
            {
              title: 'Linux Operating System Hardening & CLI Mastery',
              description: 'File permissions, systemctl, iptables/UFW, SSH key hardening, and auditing tools (Lynis).',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Host Security & Linux Audit',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Perform automated and manual security audits on a Linux server',
                      description: 'Configure UFW firewall, disable root SSH logins, and run Lynis security audits.',
                      resourceTitle: 'CIS Linux Benchmarks',
                      resourceUrl: 'https://www.cisecurity.org/benchmark/ubuntu_linux',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Applied Cryptography & Web Application Security (OWASP Top 10)',
          description: 'Master symmetric/asymmetric encryption, hashing, XSS, SQLi, CSRF, SSRF, and authentication bypasses.',
          type: NodeType.MANDATORY,
          estimatedHours: 30,
          topics: [
            {
              title: 'Web Application Vulnerabilities (OWASP Top 10)',
              description: 'Burp Suite, OWASP ZAP, SQL injection, cross-site scripting, and broken object level authorization (BOLA).',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Vulnerability Assessment with Burp Suite',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Intercept and exploit OWASP Top 10 web vulnerabilities in lab environments',
                      description: 'Practice SQLi, SSRF, and IDOR attacks using PortSwigger Web Security Academy labs.',
                      resourceTitle: 'PortSwigger Web Security Academy',
                      resourceUrl: 'https://portswigger.net/web-security',
                      resourceType: 'EXERCISE',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'SOC Operations, SIEM Threat Detection & Incident Response',
          description: 'Log analysis, Splunk, Elastic Security, MITRE ATT&CK framework mapping, and incident handling.',
          type: NodeType.RECOMMENDED,
          estimatedHours: 25,
          topics: [
            {
              title: 'SIEM Log Correlation & Querying',
              description: 'Splunk SPL, Sigma rules, detecting brute-force, privilege escalation, and lateral movement.',
              type: NodeType.RECOMMENDED,
              subtopics: [
                {
                  title: 'Threat Hunting & SIEM Analytics',
                  type: NodeType.RECOMMENDED,
                  checklistItems: [
                    {
                      title: 'Write detection rules in Splunk/Elastic and map alerts to MITRE ATT&CK tactics',
                      description: 'Correlate Windows Event Logs (Sysmon) and firewall alerts to reconstruct attack chains.',
                      resourceTitle: 'MITRE ATT&CK Matrix',
                      resourceUrl: 'https://attack.mitre.org/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Penetration Testing, Cloud Security & Defense-in-Depth',
          description: 'Nmap, Metasploit, Privilege Escalation, AWS IAM Security, and DevSecOps integration.',
          type: NodeType.OPTIONAL,
          estimatedHours: 20,
          topics: [
            {
              title: 'Network Penetration Testing & Active Directory',
              description: 'Reconnaissance, Kerberoasting, Pass-the-Hash, and privilege escalation methodologies.',
              type: NodeType.OPTIONAL,
              subtopics: [
                {
                  title: 'Offensive Security Labs',
                  type: NodeType.OPTIONAL,
                  checklistItems: [
                    {
                      title: 'Complete hands-on penetration testing machines on TryHackMe / HackTheBox',
                      description: 'Perform initial recon, find exploitable CVEs, obtain user shells, and escalate privileges to root/SYSTEM.',
                      resourceTitle: 'TryHackMe Cyber Defense Path',
                      resourceUrl: 'https://tryhackme.com/',
                      resourceType: 'EXERCISE',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
  }

  private getDevOpsFallback(targetRole: string): GeneratedRoadmapOutput {
    return {
      targetRole,
      modules: [
        {
          title: 'Linux Fundamentals, Bash Scripting & Git Workflow',
          description: 'Operating systems internals, process management, networking CLI, shell automation, and Git trunk-based development.',
          type: NodeType.MANDATORY,
          estimatedHours: 20,
          topics: [
            {
              title: 'Advanced Linux Administration & Scripting',
              description: 'Bash scripts, cron jobs, sed/awk, systemd services, SSH management, and kernel logs.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'System Automation with Bash',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Build automated backup and server health monitoring Bash scripts',
                      description: 'Implement idempotent shell scripts with robust error handling, trap signals, and logging.',
                      resourceTitle: 'Linux Foundation Sysadmin Basics',
                      resourceUrl: 'https://www.linux.org/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Containerization & Container Orchestration (Docker & Kubernetes)',
          description: 'Multi-stage Docker builds, image optimizations, K8s Pods, Deployments, Services, Ingress, and ConfigMaps.',
          type: NodeType.MANDATORY,
          estimatedHours: 35,
          topics: [
            {
              title: 'Docker Deep Dive & Multi-Stage Builds',
              description: 'OCI standards, rootless containers, layers, caching, and vulnerability scanning with Trivy.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Container Optimization & Security',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Dockerize a multi-service web application with minimal image sizes and non-root users',
                      description: 'Build Alpine/distroless multi-stage Dockerfiles and scan with Trivy.',
                      resourceTitle: 'Docker Documentation',
                      resourceUrl: 'https://docs.docker.com/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
            {
              title: 'Kubernetes Production Architecture',
              description: 'Control plane, Kubelet, Pods, Deployments, Services, Ingress, HPA, Helm charts, and Kustomize.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Deploying Resilient Workloads on Kubernetes',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Deploy a high-availability microservice cluster with Helm, Ingress, and auto-scaling',
                      description: 'Configure readiness/liveness probes, resource limits, and Horizontal Pod Autoscalers (HPA).',
                      resourceTitle: 'Kubernetes Official Documentation',
                      resourceUrl: 'https://kubernetes.io/docs/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'CI/CD Automation & GitOps (GitHub Actions & ArgoCD)',
          description: 'Automated test runners, build pipelines, semantic versioning, artifact registries, and declarative GitOps deployments.',
          type: NodeType.RECOMMENDED,
          estimatedHours: 25,
          topics: [
            {
              title: 'Continuous Integration & Continuous Delivery Pipelines',
              description: 'GitHub Actions workflows, matrix builds, automated rollback strategies, and secret management.',
              type: NodeType.RECOMMENDED,
              subtopics: [
                {
                  title: 'End-to-End GitOps Pipeline',
                  type: NodeType.RECOMMENDED,
                  checklistItems: [
                    {
                      title: 'Implement a zero-downtime CI/CD pipeline deploying to K8s via ArgoCD',
                      description: 'Automate linting, unit tests, Docker image pushing to registry, and ArgoCD sync on main merge.',
                      resourceTitle: 'ArgoCD Documentation',
                      resourceUrl: 'https://argo-cd.readthedocs.io/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Infrastructure as Code (Terraform) & Cloud Observability',
          description: 'Terraform HCL, state management, remote backends, Prometheus metrics, Grafana dashboards, and OpenTelemetry.',
          type: NodeType.RECOMMENDED,
          estimatedHours: 25,
          topics: [
            {
              title: 'Infrastructure as Code with Terraform',
              description: 'Terraform modules, variables, state locking with DynamoDB/S3, and drift detection.',
              type: NodeType.RECOMMENDED,
              subtopics: [
                {
                  title: 'Provision Cloud Infrastructure Declaratively',
                  type: NodeType.RECOMMENDED,
                  checklistItems: [
                    {
                      title: 'Provision VPC, subnets, and managed Kubernetes cluster using reusable Terraform modules',
                      description: 'Maintain strict state isolation across development and production environments.',
                      resourceTitle: 'Terraform Documentation',
                      resourceUrl: 'https://developer.hashicorp.com/terraform/docs',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
            {
              title: 'Observability (Prometheus, Grafana & OpenTelemetry)',
              description: 'Golden signals, scraping endpoints, PromQL queries, alerting rules, and distributed tracing.',
              type: NodeType.OPTIONAL,
              subtopics: [
                {
                  title: 'Full-Stack Observability Pipeline',
                  type: NodeType.OPTIONAL,
                  checklistItems: [
                    {
                      title: 'Set up Prometheus metric scraping and build Grafana dashboards with P99 latency alerts',
                      description: 'Instrument services with OpenTelemetry to trace requests across microservice boundaries.',
                      resourceTitle: 'Prometheus & Grafana Guide',
                      resourceUrl: 'https://prometheus.io/docs/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
  }

  private getCloudFallback(targetRole: string): GeneratedRoadmapOutput {
    return {
      targetRole,
      modules: [
        {
          title: 'Cloud Computing Foundations & Core Architecture (AWS / GCP / Azure)',
          description: 'Global infrastructure, regions, availability zones, virtualization, compute (EC2/GCE), and cloud storage tiers.',
          type: NodeType.MANDATORY,
          estimatedHours: 25,
          topics: [
            {
              title: 'Compute & Storage Architecture',
              description: 'Virtual machines, auto-scaling groups, load balancers (ALB/NLB), object storage (S3), and block storage (EBS).',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'High-Availability Cloud Hosting',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Deploy a multi-AZ scalable web application behind an Application Load Balancer',
                      description: 'Configure auto-scaling policies based on CPU utilization and health-check endpoints.',
                      resourceTitle: 'AWS Well-Architected Framework',
                      resourceUrl: 'https://aws.amazon.com/architecture/well-architected/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Cloud Networking, VPC & Identity Access Management (IAM)',
          description: 'CIDR blocks, public/private subnets, NAT Gateways, Route Tables, Security Groups, NACLs, and least-privilege IAM policies.',
          type: NodeType.MANDATORY,
          estimatedHours: 30,
          topics: [
            {
              title: 'Secure Cloud Networking & VPC Design',
              description: 'Custom VPCs, internet gateways, VPC peering, Transit Gateway, and private endpoints.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Enterprise VPC Architecture',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Build a secure multi-tier VPC with public, private, and isolated database subnets',
                      description: 'Implement strict Security Group rules, NAT Gateways, and route table associations.',
                      resourceTitle: 'AWS VPC User Guide',
                      resourceUrl: 'https://docs.aws.amazon.com/vpc/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
            {
              title: 'IAM Security & Role-Based Access Control (RBAC)',
              description: 'IAM users, groups, roles, policy JSON structure, permission boundaries, and MFA enforcement.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Zero-Trust IAM Enforcement',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Design least-privilege IAM policies and assume-role workflows for CI/CD and services',
                      description: 'Audit permissions and eliminate wildcard (*) policies across services.',
                      resourceTitle: 'AWS IAM Best Practices',
                      resourceUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Serverless, Managed Databases & Microservices',
          description: 'AWS Lambda / Cloud Functions, API Gateway, DynamoDB, Amazon Aurora, SQS, SNS, and EventBridge.',
          type: NodeType.RECOMMENDED,
          estimatedHours: 25,
          topics: [
            {
              title: 'Event-Driven Serverless Architecture',
              description: 'Stateless functions, event triggers, asynchronous queue processing, and dead-letter queues (DLQ).',
              type: NodeType.RECOMMENDED,
              subtopics: [
                {
                  title: 'Event-Driven Microservice Pipeline',
                  type: NodeType.RECOMMENDED,
                  checklistItems: [
                    {
                      title: 'Build a serverless image processing pipeline using S3 event triggers, Lambda, and DynamoDB',
                      description: 'Implement decoupled event processing with SQS and error retry queues.',
                      resourceTitle: 'Serverless Land Patterns',
                      resourceUrl: 'https://serverlessland.com/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Cloud Automation (Terraform), FinOps & Security Compliance',
          description: 'Infrastructure as Code, CloudWatch / CloudTrail, AWS Config, cost optimization, and multi-region failover.',
          type: NodeType.OPTIONAL,
          estimatedHours: 20,
          topics: [
            {
              title: 'Cloud Cost Optimization & Compliance Auditing',
              description: 'Cost Explorer, Savings Plans, Reserved Instances, CloudTrail audit trails, and KMS encryption.',
              type: NodeType.OPTIONAL,
              subtopics: [
                {
                  title: 'FinOps & Governance Automation',
                  type: NodeType.OPTIONAL,
                  checklistItems: [
                    {
                      title: 'Set up CloudWatch billing alarms, budget limits, and KMS customer-managed encryption keys',
                      description: 'Implement automated S3 lifecycle rules to transition objects to Glacier storage.',
                      resourceTitle: 'FinOps Foundation Framework',
                      resourceUrl: 'https://www.finops.org/framework/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
  }

  private getProductManagerFallback(targetRole: string): GeneratedRoadmapOutput {
    return {
      targetRole,
      modules: [
        {
          title: 'Product Discovery, User Research & Customer Problem Framing',
          description: 'Qualitative customer interviews, survey design, persona development, JTBD (Jobs to Be Done), and market sizing (TAM/SAM/SOM).',
          type: NodeType.MANDATORY,
          estimatedHours: 20,
          topics: [
            {
              title: 'Customer Discovery & Opportunity Mapping',
              description: 'Continuous discovery habits, problem statement drafting, assumption mapping, and competitor benchmarking.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'User Interview Synthesis & Persona Creation',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Conduct user discovery interviews and synthesize findings into an Opportunity Solution Tree',
                      description: 'Identify unaddressed user pain points and validate target customer willingness to adopt.',
                      resourceTitle: 'Continuous Discovery Habits by Teresa Torres',
                      resourceUrl: 'https://www.producttalk.org/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Product Strategy, Roadmapping & Prioritization Frameworks',
          description: 'Vision-to-execution alignment, RICE, MoSCoW, Kano models, value vs effort matrices, and outcome-based roadmap construction.',
          type: NodeType.MANDATORY,
          estimatedHours: 25,
          topics: [
            {
              title: 'Roadmapping & Feature Prioritization',
              description: 'Now-Next-Later roadmaps, stakeholder alignment, trade-off analysis, and feature scoring.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Outcome-Driven Product Roadmap',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Create an outcome-oriented quarterly roadmap scored using the RICE framework',
                      description: 'Balance technical debt, feature requests, and strategic growth bets with clear OKRs.',
                      resourceTitle: 'ProductPlan Roadmapping Guide',
                      resourceUrl: 'https://www.productplan.com/learn/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Agile Delivery, PRD Documentation & Cross-Functional Execution',
          description: 'Writing comprehensive Product Requirement Documents (PRDs), user stories, acceptance criteria, Scrum ceremonies, and UX prototyping.',
          type: NodeType.MANDATORY,
          estimatedHours: 25,
          topics: [
            {
              title: 'PRD Authoring & Engineering Hand-off',
              description: 'Clear edge-case specifications, wireframing with Figma, user flow diagrams, and sprint grooming.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Production-Ready PRD & Sprint Specs',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Draft an end-to-end Product Requirement Document (PRD) with mockups and analytics tracking plan',
                      description: 'Include detailed user stories, technical considerations, success metrics, and release criteria.',
                      resourceTitle: 'Reforge Product Management Guides',
                      resourceUrl: 'https://www.reforge.com/blog',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Product Analytics, Experimentation (A/B Testing) & Go-to-Market (GTM)',
          description: 'North Star metric definition, funnel conversion tracking (Mixpanel/Amplitude), A/B testing statistics, and launch strategies.',
          type: NodeType.RECOMMENDED,
          estimatedHours: 20,
          topics: [
            {
              title: 'Data-Informed Iteration & Growth Funnels',
              description: 'Activation, retention curves, cohort analysis, statistical significance in experiments, and GTM plans.',
              type: NodeType.RECOMMENDED,
              subtopics: [
                {
                  title: 'A/B Test Design & Retention Analysis',
                  type: NodeType.RECOMMENDED,
                  checklistItems: [
                    {
                      title: 'Design an A/B experimentation plan with sample size calculation and metric guardrails',
                      description: 'Define hypothesis, primary KPI, secondary health metrics, and minimum detectable effect.',
                      resourceTitle: 'Amplitude Product Analytics Playbook',
                      resourceUrl: 'https://amplitude.com/playbook',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
  }

  private getBusinessAnalystFallback(targetRole: string): GeneratedRoadmapOutput {
    return {
      targetRole,
      modules: [
        {
          title: 'Business Analysis Foundations & Stakeholder Management',
          description: 'BABOK guide standards, requirement elicitation techniques (JAD, interviews), RACI matrices, and change management.',
          type: NodeType.MANDATORY,
          estimatedHours: 20,
          topics: [
            {
              title: 'Requirements Elicitation & Scope Definition',
              description: 'Stakeholder interviews, workshop facilitation, scope baseline, and change control procedures.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Stakeholder Analysis & Communication Plan',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Develop a stakeholder engagement matrix and project scope baseline document',
                      description: 'Map high-influence vs high-interest stakeholders and establish approval workflows.',
                      resourceTitle: 'IIBA BABOK Guide Overview',
                      resourceUrl: 'https://www.iiba.org/standards-and-resources/babokguide/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Business Process Modeling (BPMN) & Requirements Documentation',
          description: 'As-Is vs To-Be process mapping, BPMN 2.0 notation, swimlane diagrams, BRD, and Functional Requirement Documents (FRD).',
          type: NodeType.MANDATORY,
          estimatedHours: 25,
          topics: [
            {
              title: 'Process Mapping & Gap Analysis',
              description: 'BPMN modeling with Lucidchart/Visio, value stream mapping, bottleneck identification, and root cause analysis.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Process Optimization & BRD Drafting',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Map an enterprise business workflow in BPMN 2.0 and write a complete Business Requirements Document (BRD)',
                      description: 'Document current state bottlenecks, proposed future state improvements, and business value impact.',
                      resourceTitle: 'BPMN 2.0 Specification Guide',
                      resourceUrl: 'https://www.bpmn.org/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Data Analysis for Business Decisions (SQL, Excel & BI Dashboards)',
          description: 'Advanced Excel (PivotTables, Power Query, XLOOKUP), relational database querying (SQL), and executive dashboards in Power BI/Tableau.',
          type: NodeType.MANDATORY,
          estimatedHours: 30,
          topics: [
            {
              title: 'Data Extraction & BI Visualization',
              description: 'SQL joins, aggregations, window functions, and interactive executive KPI dashboards.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Executive KPI Dashboard & Insights Report',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Extract business transactional data with SQL and build an interactive Power BI / Tableau dashboard',
                      description: 'Highlight revenue trends, operational bottlenecks, and automated variance analysis.',
                      resourceTitle: 'Microsoft Power BI Guidance',
                      resourceUrl: 'https://learn.microsoft.com/en-us/power-bi/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Financial Feasibility, Cost-Benefit Analysis (CBA) & Solution Assessment',
          description: 'ROI calculation, NPV, IRR, break-even analysis, User Acceptance Testing (UAT) test plans, and post-implementation reviews.',
          type: NodeType.RECOMMENDED,
          estimatedHours: 20,
          topics: [
            {
              title: 'Business Case Development & UAT Governance',
              description: 'Financial feasibility models, vendor evaluations (RFP), UAT test scripts, and defect triage.',
              type: NodeType.RECOMMENDED,
              subtopics: [
                {
                  title: 'Business Case & UAT Test Plan',
                  type: NodeType.RECOMMENDED,
                  checklistItems: [
                    {
                      title: 'Draft a comprehensive business case with cost-benefit analysis and UAT test execution plan',
                      description: 'Quantify 3-year projected ROI, payback period, risk mitigations, and user sign-off criteria.',
                      resourceTitle: 'Harvard Business Review Business Case Guide',
                      resourceUrl: 'https://hbr.org/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
  }

  private getUIUXFallback(targetRole: string): GeneratedRoadmapOutput {
    return {
      targetRole,
      modules: [
        {
          title: 'Design Foundations, User Research & Information Architecture',
          description: 'Gestalt principles, color theory, typography, accessibility (WCAG 2.1), user interviews, and sitemaps.',
          type: NodeType.MANDATORY,
          estimatedHours: 20,
          topics: [
            {
              title: 'Visual Hierarchy & Usability Principles',
              description: 'Spacing, contrast ratios, grid systems, and micro-interactions.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'User Flows & Wireframing',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Create low-fidelity wireframes and user flow diagrams for a multi-step checkout experience',
                      description: 'Map out happy paths, error states, and edge cases in Figma.',
                      resourceTitle: 'Nielsen Norman Group UX Basics',
                      resourceUrl: 'https://www.nngroup.com/articles/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Figma Mastery, Component Libraries & Design Systems',
          description: 'Auto Layout, variants, component properties, interactive variables, and tokens.',
          type: NodeType.MANDATORY,
          estimatedHours: 30,
          topics: [
            {
              title: 'Design System Architecture',
              description: 'Scalable color styles, typography tokens, component variants, and documentation.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Building a Complete Design System in Figma',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Build a production-ready component library with Auto Layout and variable modes',
                      description: 'Create buttons, input fields, modals, and responsive navigation bars with light/dark modes.',
                      resourceTitle: 'Figma Design Systems Guide',
                      resourceUrl: 'https://www.figma.com/best-practices/guide-to-developer-handoff/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Interactive Prototyping & Usability Testing',
          description: 'Smart Animate, micro-animations, prototype testing with Maze/UserTesting, and heuristic evaluation.',
          type: NodeType.RECOMMENDED,
          estimatedHours: 20,
          topics: [
            {
              title: 'High-Fidelity Prototyping & User Testing',
              description: 'Realistic prototyping, unmoderated user tests, SUS scoring, and iteration.',
              type: NodeType.RECOMMENDED,
              subtopics: [
                {
                  title: 'Usability Study Execution',
                  type: NodeType.RECOMMENDED,
                  checklistItems: [
                    {
                      title: 'Conduct usability testing sessions on high-fidelity prototype and document findings',
                      description: 'Calculate task completion rate, time on task, and iterate on UI pain points.',
                      resourceTitle: 'Interaction Design Foundation Prototyping',
                      resourceUrl: 'https://www.interaction-design.org/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
  }

  private getMachineLearningFallback(targetRole: string): GeneratedRoadmapOutput {
    return {
      targetRole,
      modules: [
        {
          title: 'Linear Algebra, Calculus, Probability & Python for ML',
          description: 'Matrix operations, eigenvalues, partial derivatives, probability distributions, NumPy, Pandas, and SciPy.',
          type: NodeType.MANDATORY,
          estimatedHours: 25,
          topics: [
            {
              title: 'Mathematical Foundations of Machine Learning',
              description: 'Vector spaces, gradient descent optimization, loss functions, and maximum likelihood estimation.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Vectorized Computation with NumPy',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Implement Linear Regression and Logistic Regression from scratch using only NumPy',
                      description: 'Code forward propagation, cross-entropy loss, and gradient descent updates without external ML libraries.',
                      resourceTitle: 'DeepLearning.AI Mathematics for ML',
                      resourceUrl: 'https://www.deeplearning.ai/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Classical Machine Learning Algorithms & Feature Engineering',
          description: 'Scikit-Learn, Random Forests, XGBoost, LightGBM, SVMs, clustering (K-Means, DBSCAN), and cross-validation.',
          type: NodeType.MANDATORY,
          estimatedHours: 30,
          topics: [
            {
              title: 'Supervised & Unsupervised Modeling',
              description: 'Hyperparameter tuning with Optuna, handling class imbalance (SMOTE), and SHAP explainability.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'End-to-End Predictive Pipeline',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Build an end-to-end tabular prediction pipeline with automated preprocessing and XGBoost',
                      description: 'Implement k-fold cross-validation, feature importance analysis with SHAP, and evaluate ROC-AUC.',
                      resourceTitle: 'Scikit-Learn Documentation',
                      resourceUrl: 'https://scikit-learn.org/stable/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Deep Learning Architectures (PyTorch, CNNs & Transformers)',
          description: 'Tensors, autograd, backpropagation, Convolutional Neural Networks, Attention mechanisms, and Hugging Face.',
          type: NodeType.RECOMMENDED,
          estimatedHours: 35,
          topics: [
            {
              title: 'Deep Neural Networks in PyTorch',
              description: 'Custom nn.Module architectures, DataLoader pipelines, learning rate schedulers, and GPU acceleration with CUDA.',
              type: NodeType.RECOMMENDED,
              subtopics: [
                {
                  title: 'Custom PyTorch Model Training',
                  type: NodeType.RECOMMENDED,
                  checklistItems: [
                    {
                      title: 'Train a custom PyTorch Vision or Transformer classifier with mixed precision training',
                      description: 'Track loss and validation metrics using Weights & Biases / MLflow.',
                      resourceTitle: 'PyTorch Official Tutorials',
                      resourceUrl: 'https://pytorch.org/tutorials/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'MLOps, Model Serving & Feature Stores',
          description: 'FastAPI, Docker, Triton Inference Server, ONNX runtime, Feast, MLflow, and CI/CD for models.',
          type: NodeType.OPTIONAL,
          estimatedHours: 20,
          topics: [
            {
              title: 'Production Model Deployment & Monitoring',
              description: 'Model quantization (int8/FP16), data drift detection with Evidently AI, and low-latency REST/gRPC endpoints.',
              type: NodeType.OPTIONAL,
              subtopics: [
                {
                  title: 'Deploy Scalable ML Microservice',
                  type: NodeType.OPTIONAL,
                  checklistItems: [
                    {
                      title: 'Deploy an ONNX-optimized model behind a FastAPI container with drift monitoring',
                      description: 'Benchmark latency and monitor inference throughput under simulated traffic.',
                      resourceTitle: 'MLflow Documentation',
                      resourceUrl: 'https://mlflow.org/docs/latest/index.html',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
  }

  private getDataScientistFallback(targetRole: string): GeneratedRoadmapOutput {
    return {
      targetRole,
      modules: [
        {
          title: 'Exploratory Data Analysis, Statistics & Data Wrangling',
          description: 'Inferential statistics, hypothesis testing (t-tests, ANOVA, chi-square), Pandas, Seaborn, and data imputation.',
          type: NodeType.MANDATORY,
          estimatedHours: 25,
          topics: [
            {
              title: 'Statistical Inference & Hypothesis Testing',
              description: 'Central limit theorem, p-values, confidence intervals, A/B testing statistical frameworks, and power analysis.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'A/B Experiment Statistical Analysis',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Analyze an A/B test dataset in Python, verify sample ratio mismatch (SRM), and calculate statistical significance',
                      description: 'Perform power calculations and compute confidence intervals for conversion rate differences.',
                      resourceTitle: 'Practical Statistics for Data Scientists',
                      resourceUrl: 'https://www.oreilly.com/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Advanced Predictive Modeling & Machine Learning',
          description: 'Regression analysis, classification, ensemble models, clustering, time-series forecasting (Prophet, ARIMA), and feature importance.',
          type: NodeType.MANDATORY,
          estimatedHours: 30,
          topics: [
            {
              title: 'Time Series & Supervised ML Pipelines',
              description: 'Stationarity tests, autocorrelation (ACF/PACF), seasonal decomposition, and gradient boosting trees.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Demand Forecasting & Customer Lifetime Value (CLV) Model',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Build a time-series demand forecasting model and evaluate MAPE/RMSE against a baseline',
                      description: 'Engineer lag features, rolling averages, and tune model hyperparameters.',
                      resourceTitle: 'Kaggle Learn Data Science',
                      resourceUrl: 'https://www.kaggle.com/learn',
                      resourceType: 'EXERCISE',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Big Data Processing & Production SQL (Spark, DuckDB & BigQuery)',
          description: 'Window functions, CTEs, PySpark DataFrames, distributed aggregations, and data warehouse modeling.',
          type: NodeType.RECOMMENDED,
          estimatedHours: 20,
          topics: [
            {
              title: 'Large-Scale Data Transformations',
              description: 'Distributed execution plans, partition pruning, and optimizing complex SQL joins.',
              type: NodeType.RECOMMENDED,
              subtopics: [
                {
                  title: 'PySpark Large-Scale ETL & Analysis',
                  type: NodeType.RECOMMENDED,
                  checklistItems: [
                    {
                      title: 'Process multi-gigabyte datasets using PySpark and generate analytical feature tables',
                      description: 'Optimize execution using broadcasting joins and efficient column caching.',
                      resourceTitle: 'Apache Spark Documentation',
                      resourceUrl: 'https://spark.apache.org/docs/latest/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
  }

  private getDataAnalystFallback(targetRole: string): GeneratedRoadmapOutput {
    return {
      targetRole,
      modules: [
        {
          title: 'Advanced SQL Querying & Relational Data Extraction',
          description: 'Complex JOINs, Window Functions (ROW_NUMBER, RANK, LAG/LEAD), subqueries, CTEs, and aggregation filters.',
          type: NodeType.MANDATORY,
          estimatedHours: 25,
          topics: [
            {
              title: 'Mastering SQL for Analytics',
              description: 'Analytical queries, cohorts, customer retention matrices, and database indexing fundamentals.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Cohort & Retention SQL Queries',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Write complex SQL queries to calculate monthly recurring revenue (MRR) and user retention cohorts',
                      description: 'Utilize CTEs and window functions to compute month-over-month growth metrics.',
                      resourceTitle: 'Mode Analytics SQL Tutorial',
                      resourceUrl: 'https://mode.com/sql-tutorial/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Business Intelligence, Dashboarding & Storytelling (Power BI & Tableau)',
          description: 'DAX expressions, Power Query ETL, calculated fields, parameters, interactive filters, and executive dashboard design.',
          type: NodeType.MANDATORY,
          estimatedHours: 25,
          topics: [
            {
              title: 'Interactive BI Dashboards',
              description: 'Designing user-friendly KPI cards, drill-down charts, and data storytelling for leadership.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Executive Sales & Operations Dashboard',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Build a complete interactive Power BI / Tableau dashboard with dynamic date filtering and DAX KPIs',
                      description: 'Incorporate YTD revenue, gross margin, and customer acquisition metrics with drill-down views.',
                      resourceTitle: 'Microsoft Power BI Documentation',
                      resourceUrl: 'https://learn.microsoft.com/en-us/power-bi/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Python for Data Analysis (Pandas, Matplotlib & Seaborn)',
          description: 'Data cleaning, reshaping (pivot/melt), merging datasets, exploratory visualizations, and statistical summaries.',
          type: NodeType.RECOMMENDED,
          estimatedHours: 20,
          topics: [
            {
              title: 'Automating Analysis with Python',
              description: 'Automating reporting scripts, cleaning dirty data, and exporting insights to stakeholders.',
              type: NodeType.RECOMMENDED,
              subtopics: [
                {
                  title: 'Exploratory Data Analysis Report',
                  type: NodeType.RECOMMENDED,
                  checklistItems: [
                    {
                      title: 'Perform exploratory analysis on messy real-world data and generate visualization reports in Jupyter',
                      description: 'Identify anomalies, correlation matrices, and output cleaned data summary statistics.',
                      resourceTitle: 'Pandas Documentation',
                      resourceUrl: 'https://pandas.pydata.org/docs/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
  }

  private getSoftwareEngineerFallback(targetRole: string): GeneratedRoadmapOutput {
    return {
      targetRole,
      modules: [
        {
          title: 'Data Structures, Algorithms & Time Complexity',
          description: 'Arrays, Hash Maps, Linked Lists, Trees, Graphs, Dynamic Programming, and asymptotic Big-O analysis.',
          type: NodeType.MANDATORY,
          estimatedHours: 35,
          topics: [
            {
              title: 'Core Algorithm Patterns',
              description: 'Two pointers, sliding window, BFS/DFS, binary search, and recursive backtracking.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Algorithmic Problem Solving',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Solve foundational algorithmic problems covering BFS/DFS and dynamic programming',
                      description: 'Analyze time and space complexity trade-offs for each solution.',
                      resourceTitle: 'NeetCode 150 Roadmap',
                      resourceUrl: 'https://neetcode.io/',
                      resourceType: 'EXERCISE',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Software Design Patterns, OOP & Clean Architecture',
          description: 'SOLID principles, design patterns (Factory, Singleton, Observer, Strategy), clean code, and unit testing.',
          type: NodeType.MANDATORY,
          estimatedHours: 25,
          topics: [
            {
              title: 'Design Patterns & Test-Driven Development',
              description: 'Refactoring, dependency injection, mocking, and writing maintainable unit and integration test suites.',
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Refactoring & Clean Code Patterns',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: 'Design a modular application applying SOLID principles and achieve >85% unit test coverage',
                      description: 'Implement interfaces, dependency injection, and comprehensive unit tests with mocks.',
                      resourceTitle: 'Refactoring Guru Design Patterns',
                      resourceUrl: 'https://refactoring.guru/design-patterns',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'System Design, Concurrency & Distributed Fundamentals',
          description: 'Scalability, caching (Redis), message queues (RabbitMQ/Kafka), database sharding, and ACID vs BASE.',
          type: NodeType.RECOMMENDED,
          estimatedHours: 30,
          topics: [
            {
              title: 'High-Scale System Architecture',
              description: 'Microservices vs Monoliths, load balancing, rate limiting, and eventual consistency models.',
              type: NodeType.RECOMMENDED,
              subtopics: [
                {
                  title: 'Scalable Microservice Architecture',
                  type: NodeType.RECOMMENDED,
                  checklistItems: [
                    {
                      title: 'Design a distributed rate limiter and URL shortener capable of handling 10,000 requests/second',
                      description: 'Document database schema, caching strategy, and failure recovery protocols.',
                      resourceTitle: 'System Design Primer',
                      resourceUrl: 'https://github.com/donnemartin/system-design-primer',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
  }

  private getGenericCareerFallback(targetRole: string): GeneratedRoadmapOutput {
    return {
      targetRole,
      modules: [
        {
          title: `Foundations & Core Competencies for ${targetRole}`,
          description: `Master fundamental domain knowledge, core tooling, and industry standards required for ${targetRole}.`,
          type: NodeType.MANDATORY,
          estimatedHours: 25,
          topics: [
            {
              title: 'Core Domain Fundamentals',
              description: `Essential concepts, terminology, and foundational workflows for ${targetRole}.`,
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Foundational Knowledge & Tooling',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: `Complete comprehensive baseline study for ${targetRole}`,
                      description: 'Understand industry standards, methodologies, and core tools used by professional practitioners.',
                      resourceTitle: 'Official Documentation & Standards',
                      resourceUrl: 'https://roadmap.sh/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: `Applied Workflows & Production Skills for ${targetRole}`,
          description: `Hands-on projects, industry workflows, practical problem solving, and modern best practices in ${targetRole}.`,
          type: NodeType.MANDATORY,
          estimatedHours: 30,
          topics: [
            {
              title: 'Practical Project Implementation',
              description: `Building end-to-end projects demonstrating competence in ${targetRole}.`,
              type: NodeType.MANDATORY,
              subtopics: [
                {
                  title: 'Hands-On Portfolio Project',
                  type: NodeType.MANDATORY,
                  checklistItems: [
                    {
                      title: `Build and document an end-to-end showcase project for ${targetRole}`,
                      description: 'Implement a real-world project demonstrating practical problem-solving and documentation.',
                      resourceTitle: 'Portfolio Best Practices',
                      resourceUrl: 'https://github.com/',
                      resourceType: 'EXERCISE',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Advanced Topics, Optimization & Interview Preparation',
          description: `Industry case studies, performance optimization, portfolio building, and interview readiness for ${targetRole}.`,
          type: NodeType.RECOMMENDED,
          estimatedHours: 20,
          topics: [
            {
              title: 'Career Readiness & Technical Interview Preparation',
              description: `Behavioral and technical interview prep, case studies, and advanced specialization for ${targetRole}.`,
              type: NodeType.RECOMMENDED,
              subtopics: [
                {
                  title: 'Interview Mastery & Case Studies',
                  type: NodeType.RECOMMENDED,
                  checklistItems: [
                    {
                      title: `Prepare technical portfolio and practice real-world interview scenarios for ${targetRole}`,
                      description: 'Review common interview questions, architecture trade-offs, and behavioral success stories.',
                      resourceTitle: 'Career Guide & Interview Prep',
                      resourceUrl: 'https://roadmap.sh/',
                      resourceType: 'DOCUMENTATION',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
  }
}
