// Domain Models & Constants
export var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["INACTIVE"] = "INACTIVE";
    UserStatus["DEACTIVATED"] = "DEACTIVATED";
})(UserStatus || (UserStatus = {}));
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