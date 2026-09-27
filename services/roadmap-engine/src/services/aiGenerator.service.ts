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
  modules: z.array(GeneratedModuleSchema).min(3),
});

export interface RoadmapGenerationInput {
  userId: string;
  targetRole: string;
  targetCompanies?: string[];
  targetTimeline?: string;
  experienceLevel?: string;
  currentSkills?: string[];
  background?: string;
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
          temperature: 0.3,
          topP: 0.95,
          maxOutputTokens: 8192,
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
    return `
You are the CareerOS AI Senior Curriculum Architect.
Generate a structured, rigorous, and highly actionable learning roadmap for a student/engineer aiming for the target role: "${input.targetRole}".

User Profile:
- Target Role: ${input.targetRole}
- Target Timeline: ${input.targetTimeline || '6 Months'}
- Experience Level: ${input.experienceLevel || 'Beginner to Intermediate'}
- Target Companies: ${input.targetCompanies?.join(', ') || 'Top Tech & Startups'}
- Current Known Skills: ${input.currentSkills?.join(', ') || 'Foundational Programming'}

Requirements:
1. Provide between 4 and 6 sequential Modules.
2. Categorize each Module, Topic, and Subtopic as either:
   - "MANDATORY": Core non-negotiable foundations required for any interview for this role.
   - "RECOMMENDED": Production-level frameworks, testing, and modern industry workflows.
   - "OPTIONAL": Specialized niches, advanced scale patterns, or bonus domain electives.
3. Every Module must contain 2-4 Topics.
4. Every Topic must contain 1-2 Subtopics.
5. Every Subtopic must contain 1-3 concrete Checklist Items. Each Checklist Item MUST be an actionable learning task with a title and clear description.
6. Provide resourceTitle (e.g. "Official Docs", "MDN Reference", "Interactive Tutorial") and resourceType ("DOCUMENTATION" | "VIDEO" | "EXERCISE").

Output MUST be strictly valid JSON matching this schema:
{
  "targetRole": "${input.targetRole}",
  "modules": [
    {
      "title": "Module Title",
      "description": "Module overview",
      "type": "MANDATORY" | "RECOMMENDED" | "OPTIONAL",
      "estimatedHours": 15,
      "topics": [
        {
          "title": "Topic Title",
          "description": "Topic description",
          "type": "MANDATORY" | "RECOMMENDED" | "OPTIONAL",
          "subtopics": [
            {
              "title": "Subtopic Title",
              "type": "MANDATORY" | "RECOMMENDED" | "OPTIONAL",
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
        const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
        dataToParse = JSON.parse(cleaned);
      }

      if (dataToParse && typeof dataToParse === 'object' && !('targetRole' in dataToParse)) {
        (dataToParse as Record<string, unknown>).targetRole = targetRole;
      }

      const result = GeneratedRoadmapSchema.safeParse(dataToParse);
      if (result.success) {
        return result.data;
      }
      logger.warn({ errors: result.error.errors }, 'Schema validation failed for AI roadmap');
      return null;
    } catch (err) {
      logger.warn({ err }, 'Failed to parse AI output into JSON');
      return null;
    }
  }

  public getFallbackRoadmap(input: RoadmapGenerationInput): GeneratedRoadmapOutput {
    const roleLower = input.targetRole.toLowerCase();

    if (roleLower.includes('frontend')) {
      return this.getFrontendFallback(input.targetRole);
    } else if (roleLower.includes('backend')) {
      return this.getBackendFallback(input.targetRole);
    } else if (roleLower.includes('ai') || roleLower.includes('machine learning') || roleLower.includes('data')) {
      return this.getAIFallback(input.targetRole);
    }

    return this.getFullStackFallback(input.targetRole);
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
}
