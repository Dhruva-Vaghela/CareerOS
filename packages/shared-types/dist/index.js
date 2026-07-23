// Domain Models & Constants
export var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["INACTIVE"] = "INACTIVE";
    UserStatus["DEACTIVATED"] = "DEACTIVATED";
})(UserStatus || (UserStatus = {}));
export var CurrentStatus;
(function (CurrentStatus) {
    CurrentStatus["STUDENT"] = "STUDENT";
    CurrentStatus["WORKING_PROFESSIONAL"] = "WORKING_PROFESSIONAL";
    CurrentStatus["JOB_SEEKER"] = "JOB_SEEKER";
    CurrentStatus["CAREER_SWITCHER"] = "CAREER_SWITCHER";
})(CurrentStatus || (CurrentStatus = {}));
export var ExperienceLevel;
(function (ExperienceLevel) {
    ExperienceLevel["BEGINNER"] = "BEGINNER";
    ExperienceLevel["INTERMEDIATE"] = "INTERMEDIATE";
    ExperienceLevel["ADVANCED"] = "ADVANCED";
    ExperienceLevel["PROFESSIONAL"] = "PROFESSIONAL";
})(ExperienceLevel || (ExperienceLevel = {}));
export var TargetJobRole;
(function (TargetJobRole) {
    TargetJobRole["SOFTWARE_ENGINEER"] = "Software Engineer";
    TargetJobRole["AI_ENGINEER"] = "AI Engineer";
    TargetJobRole["ML_ENGINEER"] = "Machine Learning Engineer";
    TargetJobRole["DATA_SCIENTIST"] = "Data Scientist";
    TargetJobRole["DATA_ANALYST"] = "Data Analyst";
    TargetJobRole["BACKEND_DEVELOPER"] = "Backend Developer";
    TargetJobRole["FRONTEND_DEVELOPER"] = "Frontend Developer";
    TargetJobRole["FULL_STACK_DEVELOPER"] = "Full Stack Developer";
    TargetJobRole["DEVOPS_ENGINEER"] = "DevOps Engineer";
    TargetJobRole["CLOUD_ENGINEER"] = "Cloud Engineer";
    TargetJobRole["CYBERSECURITY_ANALYST"] = "Cybersecurity Analyst";
    TargetJobRole["PRODUCT_MANAGER"] = "Product Manager";
    TargetJobRole["UI_UX_DESIGNER"] = "UI/UX Designer";
    TargetJobRole["BUSINESS_ANALYST"] = "Business Analyst";
    TargetJobRole["OTHER"] = "Other";
})(TargetJobRole || (TargetJobRole = {}));
export var AvailabilityTimeframe;
(function (AvailabilityTimeframe) {
    AvailabilityTimeframe["PER_DAY"] = "PER_DAY";
    AvailabilityTimeframe["PER_WEEK"] = "PER_WEEK";
})(AvailabilityTimeframe || (AvailabilityTimeframe = {}));
export var CareerGoalStatus;
(function (CareerGoalStatus) {
    CareerGoalStatus["ACTIVE"] = "ACTIVE";
    CareerGoalStatus["COMPLETED"] = "COMPLETED";
    CareerGoalStatus["ABANDONED"] = "ABANDONED";
})(CareerGoalStatus || (CareerGoalStatus = {}));
export var NodeType;
(function (NodeType) {
    NodeType["MANDATORY"] = "MANDATORY";
    NodeType["RECOMMENDED"] = "RECOMMENDED";
    NodeType["OPTIONAL"] = "OPTIONAL";
})(NodeType || (NodeType = {}));
export var RoadmapStatus;
(function (RoadmapStatus) {
    RoadmapStatus["ACTIVE"] = "ACTIVE";
    RoadmapStatus["ARCHIVED"] = "ARCHIVED";
})(RoadmapStatus || (RoadmapStatus = {}));
export var SkillSource;
(function (SkillSource) {
    SkillSource["SELF_RATED"] = "SELF_RATED";
    SkillSource["ROADMAP_DERIVED"] = "ROADMAP_DERIVED";
    SkillSource["ASSESSMENT_VERIFIED"] = "ASSESSMENT_VERIFIED";
})(SkillSource || (SkillSource = {}));
export var ProjectStatus;
(function (ProjectStatus) {
    ProjectStatus["SUBMITTED"] = "SUBMITTED";
    ProjectStatus["VERIFIED"] = "VERIFIED";
})(ProjectStatus || (ProjectStatus = {}));
export var AssessmentType;
(function (AssessmentType) {
    AssessmentType["QUIZ"] = "QUIZ";
    AssessmentType["MODULE_ASSESSMENT"] = "MODULE_ASSESSMENT";
})(AssessmentType || (AssessmentType = {}));
export var InterviewMode;
(function (InterviewMode) {
    InterviewMode["PRACTICE"] = "PRACTICE";
    InterviewMode["COMPANY"] = "COMPANY";
})(InterviewMode || (InterviewMode = {}));
//# sourceMappingURL=index.js.map