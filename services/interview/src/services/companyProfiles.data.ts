import { InterviewRoundType } from '@careeros/shared-types';

export interface DefaultCompanyProfile {
  companyName: string;
  jobRole: string;
  experienceLevel: string;
  roundType: string;
  referencePatternNotes: string;
  competenciesTested: string[];
  defaultQuestionsCount: number;
}

export const DEFAULT_COMPANY_PROFILES: DefaultCompanyProfile[] = [
  // Google
  {
    companyName: 'Google',
    jobRole: 'Software Engineer',
    experienceLevel: 'INTERMEDIATE',
    roundType: InterviewRoundType.CODING_ALGORITHMS,
    referencePatternNotes:
      'Google standard coding round. Emphasizes clean code, optimal data structures (graphs, trees, dynamic programming), rigorous complexity analysis (Big-O time and space), and thorough edge case handling.',
    competenciesTested: ['Algorithms & Data Structures', 'Complexity Analysis', 'Edge Case Analysis', 'Clean Code'],
    defaultQuestionsCount: 4,
  },
  {
    companyName: 'Google',
    jobRole: 'Backend Developer',
    experienceLevel: 'ADVANCED',
    roundType: InterviewRoundType.SYSTEM_DESIGN,
    referencePatternNotes:
      'Google large-scale distributed systems round. Evaluates scalability, fault tolerance, data partitioning, consensus, replication, latency vs throughput trade-offs, and clear architectural diagrams.',
    competenciesTested: ['Distributed Systems', 'Scalability & Sharding', 'Reliability & Fault Tolerance', 'Trade-off Analysis'],
    defaultQuestionsCount: 4,
  },
  {
    companyName: 'Google',
    jobRole: 'Software Engineer',
    experienceLevel: 'INTERMEDIATE',
    roundType: InterviewRoundType.BEHAVIORAL_LEADERSHIP,
    referencePatternNotes:
      'Google Googleyness & Leadership (G&L) round. Evaluates navigating ambiguity, doing the right thing, intellectual humility, collaborative bias, and driving positive team impact using the STAR method.',
    competenciesTested: ['Googleyness', 'Navigating Ambiguity', 'Collaboration & Empathy', 'STAR Method'],
    defaultQuestionsCount: 4,
  },

  // Amazon
  {
    companyName: 'Amazon',
    jobRole: 'Software Engineer',
    experienceLevel: 'INTERMEDIATE',
    roundType: InterviewRoundType.BEHAVIORAL_LEADERSHIP,
    referencePatternNotes:
      'Amazon Leadership Principles (LP) deep dive. Heavily focuses on Customer Obsession, Ownership, Bias for Action, Dive Deep, Deliver Results, and Have Backbone; Disagree and Commit with deep drill-down questions.',
    competenciesTested: ['Customer Obsession', 'Ownership', 'Dive Deep', 'Bias for Action', 'Deliver Results'],
    defaultQuestionsCount: 4,
  },
  {
    companyName: 'Amazon',
    jobRole: 'Backend Developer',
    experienceLevel: 'INTERMEDIATE',
    roundType: InterviewRoundType.TECHNICAL_SCREEN,
    referencePatternNotes:
      'Amazon technical screen. Focuses on data structures, object-oriented design, RESTful API design, and practical backend problem-solving.',
    competenciesTested: ['API Design', 'Data Structures', 'Object-Oriented Design', 'Code Correctness'],
    defaultQuestionsCount: 4,
  },

  // Meta
  {
    companyName: 'Meta',
    jobRole: 'Full Stack Developer',
    experienceLevel: 'INTERMEDIATE',
    roundType: InterviewRoundType.CODING_ALGORITHMS,
    referencePatternNotes:
      'Meta rapid coding interview. Candidates are expected to solve 2 algorithm problems cleanly in 45 minutes with minimal hints, focusing on speed, accuracy, and clear communication.',
    competenciesTested: ['Coding Speed', 'Algorithm Optimization', 'Array & Hash Map Mastery', 'Edge Cases'],
    defaultQuestionsCount: 4,
  },
  {
    companyName: 'Meta',
    jobRole: 'Frontend Developer',
    experienceLevel: 'ADVANCED',
    roundType: InterviewRoundType.DOMAIN_DEEP_DIVE,
    referencePatternNotes:
      'Meta frontend architecture and UI engineering round. Focuses on component architecture, state management, DOM performance, rendering lifecycle, accessibility, and resilient networking.',
    competenciesTested: ['React / UI Architecture', 'Web Performance', 'State Management', 'Accessibility'],
    defaultQuestionsCount: 4,
  },

  // Microsoft
  {
    companyName: 'Microsoft',
    jobRole: 'Software Engineer',
    experienceLevel: 'BEGINNER',
    roundType: InterviewRoundType.TECHNICAL_SCREEN,
    referencePatternNotes:
      'Microsoft university / entry-level screen. Focuses on foundational computer science principles, problem solving, debugging, and enthusiasm for growth mindset.',
    competenciesTested: ['Data Structures', 'Debugging', 'Problem Decomposition', 'Growth Mindset'],
    defaultQuestionsCount: 4,
  },
  {
    companyName: 'Microsoft',
    jobRole: 'Cloud Engineer',
    experienceLevel: 'ADVANCED',
    roundType: InterviewRoundType.SYSTEM_DESIGN,
    referencePatternNotes:
      'Microsoft cloud architecture interview. Focuses on Azure/cloud infrastructure, container orchestration, zero-trust security, microservices, and hybrid cloud resiliency.',
    competenciesTested: ['Cloud Architecture', 'Containerization & Kubernetes', 'Security & IAM', 'High Availability'],
    defaultQuestionsCount: 4,
  },

  // Startup / High-Growth
  {
    companyName: 'High-Growth Startup',
    jobRole: 'Full Stack Developer',
    experienceLevel: 'INTERMEDIATE',
    roundType: InterviewRoundType.DOMAIN_DEEP_DIVE,
    referencePatternNotes:
      'Fast-paced startup practical engineering round. Evaluates end-to-end full stack execution, pragmatic technology choices, rapid prototyping, and shipping production-ready features under tight constraints.',
    competenciesTested: ['Full-Stack Velocity', 'Pragmatism', 'Database Query Optimization', 'Product Sense'],
    defaultQuestionsCount: 4,
  },
];

/**
 * Returns a fallback profile when a company or role is not in the predefined list.
 */
export function getGenericFallbackProfile(
  companyName: string,
  jobRole: string,
  experienceLevel: string,
  roundType: string,
): DefaultCompanyProfile {
  return {
    companyName,
    jobRole,
    experienceLevel,
    roundType,
    referencePatternNotes: `Industry standard ${roundType} interview for a ${experienceLevel} ${jobRole} at ${companyName}. Focuses on core competencies, problem-solving, architectural clarity, and communication under realistic pressure.`,
    competenciesTested: ['Core Domain Knowledge', 'Problem Solving', 'Analytical Rigor', 'Clear Communication'],
    defaultQuestionsCount: 4,
  };
}
