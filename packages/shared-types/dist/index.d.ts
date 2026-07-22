export declare enum UserStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    DEACTIVATED = "DEACTIVATED"
}
export interface User {
    id: string;
    email: string;
    passwordHash: string;
    authProvider: string;
    createdAt: Date;
    status: UserStatus;
}
export interface Session {
    id: string;
    userId: string;
    issuedAt: Date;
    expiresAt: Date;
    refreshTokenHash: string;
}
export declare enum CurrentStatus {
    STUDENT = "STUDENT",
    WORKING_PROFESSIONAL = "WORKING_PROFESSIONAL",
    JOB_SEEKER = "JOB_SEEKER",
    CAREER_SWITCHER = "CAREER_SWITCHER"
}
export declare enum ExperienceLevel {
    BEGINNER = "BEGINNER",
    INTERMEDIATE = "INTERMEDIATE",
    ADVANCED = "ADVANCED",
    PROFESSIONAL = "PROFESSIONAL"
}
export declare enum TargetJobRole {
    SOFTWARE_ENGINEER = "Software Engineer",
    AI_ENGINEER = "AI Engineer",
    ML_ENGINEER = "Machine Learning Engineer",
    DATA_SCIENTIST = "Data Scientist",
    DATA_ANALYST = "Data Analyst",
    BACKEND_DEVELOPER = "Backend Developer",
    FRONTEND_DEVELOPER = "Frontend Developer",
    FULL_STACK_DEVELOPER = "Full Stack Developer",
    DEVOPS_ENGINEER = "DevOps Engineer",
    CLOUD_ENGINEER = "Cloud Engineer",
    CYBERSECURITY_ANALYST = "Cybersecurity Analyst",
    PRODUCT_MANAGER = "Product Manager",
    UI_UX_DESIGNER = "UI/UX Designer",
    BUSINESS_ANALYST = "Business Analyst",
    OTHER = "Other"
}
export interface Profile {
    userId: string;
    fullName: string;
    profilePictureUrl?: string;
    country?: string;
    timezone?: string;
    preferredLanguage: string;
    college?: string;
    degree?: string;
    branch?: string;
    currentSemester?: number;
    graduationYear?: number;
    currentStatus?: CurrentStatus;
    targetRole: string;
    experienceLevel?: ExperienceLevel;
    interests: string[];
    profileCompleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare enum CareerGoalStatus {
    ACTIVE = "ACTIVE",
    COMPLETED = "COMPLETED",
    ABANDONED = "ABANDONED"
}
export interface CareerGoal {
    id: string;
    userId: string;
    targetRole: string;
    targetCompanies: string[];
    targetTimeline: Date;
    status: CareerGoalStatus;
    createdAt: Date;
}
export declare enum NodeType {
    MANDATORY = "MANDATORY",
    RECOMMENDED = "RECOMMENDED",
    OPTIONAL = "OPTIONAL"
}
export declare enum RoadmapStatus {
    ACTIVE = "ACTIVE",
    ARCHIVED = "ARCHIVED"
}
export interface Roadmap {
    id: string;
    userId: string;
    goalId: string;
    status: RoadmapStatus;
    generatedAt: Date;
    version: number;
}
export interface Module {
    id: string;
    roadmapId: string;
    order: number;
    title: string;
    type: NodeType;
}
export interface Topic {
    id: string;
    moduleId: string;
    order: number;
    title: string;
    type: NodeType;
}
export interface Subtopic {
    id: string;
    topicId: string;
    order: number;
    title: string;
    type: NodeType;
}
export interface ChecklistItem {
    id: string;
    subtopicId: string;
    order: number;
    title: string;
    completed: boolean;
    resourceRef?: string;
    userNote?: string;
    deadline?: Date;
}
export interface DependencyLink {
    fromNodeId: string;
    toNodeId: string;
}
export interface ProgressSnapshot {
    id: string;
    userId: string;
    roadmapId: string;
    moduleId: string;
    score: number;
    evidenceBreakdown: {
        checklistCompletion: number;
        quizPerformance: number;
        assessmentPerformance: number;
        interviewPerformance: number;
    };
    computedAt: Date;
}
export interface StudyPlan {
    id: string;
    userId: string;
    roadmapId: string;
    dailyAvailableMinutes: number;
    active: boolean;
}
export interface StudySession {
    id: string;
    studyPlanId: string;
    checklistItemId: string;
    plannedAt: Date;
    loggedAt?: Date;
    durationMinutes: number;
}
export declare enum SkillSource {
    SELF_RATED = "SELF_RATED",
    ROADMAP_DERIVED = "ROADMAP_DERIVED",
    ASSESSMENT_VERIFIED = "ASSESSMENT_VERIFIED"
}
export interface Skill {
    id: string;
    name: string;
    category: string;
}
export interface UserSkill {
    userId: string;
    skillId: string;
    confidenceLevel: number;
    source: SkillSource;
    updatedAt: Date;
}
export interface TargetRoleSkillRequirement {
    targetRole: string;
    skillId: string;
    requiredLevel: number;
}
export interface ProjectBrief {
    id: string;
    moduleId: string;
    title: string;
    description: string;
}
export declare enum ProjectStatus {
    SUBMITTED = "SUBMITTED",
    VERIFIED = "VERIFIED"
}
export interface ProjectSubmission {
    id: string;
    userId: string;
    projectBriefId: string;
    submissionUrl: string;
    status: ProjectStatus;
    submittedAt: Date;
}
export declare enum AssessmentType {
    QUIZ = "QUIZ",
    MODULE_ASSESSMENT = "MODULE_ASSESSMENT"
}
export interface AssessmentQuestion {
    id: string;
    questionText: string;
    type: 'MCQ' | 'STRUCTURED';
    options?: string[];
}
export interface Assessment {
    id: string;
    moduleId: string;
    type: AssessmentType;
    questions: AssessmentQuestion[];
}
export interface AssessmentAttempt {
    id: string;
    userId: string;
    assessmentId: string;
    answers: Record<string, string>;
    score: number;
    completedAt: Date;
}
export declare enum InterviewMode {
    PRACTICE = "PRACTICE",
    COMPANY = "COMPANY"
}
export interface InterviewSession {
    id: string;
    userId: string;
    mode: InterviewMode;
    contextSnapshot?: string;
    startedAt: Date;
    endedAt?: Date;
}
export interface InterviewQuestion {
    id: string;
    sessionId: string;
    order: number;
    questionText: string;
    targetWeakArea?: string;
    difficulty: string;
}
export interface InterviewResponse {
    id: string;
    questionId: string;
    responseTextOrAudioRef: string;
    evaluation?: {
        score: number;
        feedback: string;
    };
}
export interface InterviewFeedback {
    id: string;
    sessionId: string;
    summary: string;
    strengths: string[];
    weakAreas: string[];
    recommendations: string[];
}
export interface CompanyInterviewProfile {
    id: string;
    companyName: string;
    jobRole: string;
    experienceLevel: string;
    roundType: string;
    referencePatternNotes?: string;
}
export interface ReadinessSnapshot {
    id: string;
    userId: string;
    targetRole: string;
    score: number;
    breakdown: {
        progressScore: number;
        assessmentScore: number;
        interviewScore: number;
        skillCoverageScore: number;
    };
    computedAt: Date;
}
export interface Recommendation {
    id: string;
    userId: string;
    type: string;
    description: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    sourceReason: string;
    generatedAt: Date;
    dismissed: boolean;
}
export interface Task {
    id: string;
    userId: string;
    title: string;
    linkedEntityType?: string;
    linkedEntityId?: string;
    dueAt?: Date;
    completed: boolean;
}
export interface EventMetadata {
    eventId: string;
    timestamp: string;
    traceId: string;
    userId?: string;
}
export interface BaseEvent<T = Record<string, unknown>> {
    name: string;
    metadata: EventMetadata;
    payload: T;
}
export type UserRegisteredEvent = BaseEvent<{
    userId: string;
    email: string;
}>;
export type UserLoginEvent = BaseEvent<{
    userId: string;
    timestamp: string;
}>;
export type ProfileUpdatedEvent = BaseEvent<{
    userId: string;
    profile: Partial<Profile>;
}>;
export type GoalCreatedEvent = BaseEvent<{
    userId: string;
    goal: CareerGoal;
}>;
export type GoalChangedEvent = BaseEvent<{
    userId: string;
    oldGoal?: CareerGoal;
    newGoal: CareerGoal;
}>;
export type RoadmapGeneratedEvent = BaseEvent<{
    userId: string;
    roadmapId: string;
    goalId: string;
    modulesCount: number;
}>;
export type RoadmapNodeCompletedEvent = BaseEvent<{
    userId: string;
    roadmapId: string;
    nodeType: 'MODULE' | 'TOPIC' | 'SUBTOPIC' | 'CHECKLIST';
    nodeId: string;
}>;
export type ProgressUpdatedEvent = BaseEvent<{
    userId: string;
    roadmapId: string;
    snapshot: ProgressSnapshot;
}>;
export type SkillUpdatedEvent = BaseEvent<{
    userId: string;
    skillId: string;
    newLevel: number;
    source: SkillSource;
}>;
export type AssessmentScoredEvent = BaseEvent<{
    userId: string;
    assessmentId: string;
    attemptId: string;
    score: number;
    type: AssessmentType;
}>;
export type InterviewCompletedEvent = BaseEvent<{
    userId: string;
    sessionId: string;
    mode: InterviewMode;
    score: number;
}>;
export type ReadinessUpdatedEvent = BaseEvent<{
    userId: string;
    snapshot: ReadinessSnapshot;
}>;
//# sourceMappingURL=index.d.ts.map