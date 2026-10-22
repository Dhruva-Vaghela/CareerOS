import { createHash } from 'node:crypto';
import { ResumeATSModel, type IResumeATSDocument, type IResumeExtractionDocument } from '../db/schema.js';

const STOP_WORDS = new Set([
  'about', 'after', 'also', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'can', 'for', 'from',
  'have', 'into', 'is', 'it', 'its', 'our', 'of', 'on', 'or', 'that', 'the', 'their', 'this', 'to',
  'was', 'we', 'were', 'will', 'with', 'you', 'your', 'years', 'year', 'experience', 'required',
  'preferred', 'ability', 'work', 'role', 'job', 'team', 'candidate', 'including', 'strong',
  'must', 'qualification', 'qualifications', 'requirement', 'requirements', 'demonstrated', 'proven', 'excellent',
]);
const TERM_ALIASES: Record<string, string[]> = {
  javascript: ['js', 'ecmascript'], js: ['javascript', 'ecmascript'],
  typescript: ['ts'], ts: ['typescript'],
  'node.js': ['nodejs', 'node'], nodejs: ['node.js', 'node'], node: ['node.js', 'nodejs'],
  react: ['react.js', 'reactjs'], 'react.js': ['react', 'reactjs'], reactjs: ['react', 'react.js'],
  postgres: ['postgresql'], postgresql: ['postgres'],
  aws: ['amazon web services'], gcp: ['google cloud platform'],
  kubernetes: ['k8s'], k8s: ['kubernetes'],
  'machine learning': ['ml'], ml: ['machine learning'],
  'artificial intelligence': ['ai'], ai: ['artificial intelligence'],
};

type Category = IResumeATSDocument['breakdown']['categories'][number];
type Simulation = NonNullable<IResumeATSDocument['breakdown']['simulation']>;
type ATSRequirements = Simulation['requirements'];
type Ranking = Simulation['ranking'];

export interface ResumeATSResult {
  id: string;
  resumeId: string;
  version: number;
  score: number;
  targetRole?: string;
  jobDescription?: string;
  hasJobDescription: boolean;
  breakdown: IResumeATSDocument['breakdown'];
  interpretation: string;
  createdAt: Date;
}

const SCORE_INTERPRETATION = 'Configurable ATS-style screening simulation. Employers use different parsing, filters, and ranking rules; this result cannot reproduce a specific employer system or predict its decision.';

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function findKeywords(context: string): string[] {
  const terms = context.toLowerCase().match(/[a-z][a-z0-9+#.-]{1,}/g) ?? [];
  return [...new Set(terms.map((term) => term.replace(/^[.#-]+|[.#-]+$/g, '')).filter((term) => term.length > 1 && !STOP_WORDS.has(term)))].slice(0, 30);
}

function containsTerm(text: string, term: string): boolean {
  const alternatives = [term, ...(TERM_ALIASES[term.toLowerCase()] ?? [])];
  return alternatives.some((alternative) => {
    const escaped = alternative.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|[^a-z0-9+#])${escaped}(?:$|[^a-z0-9+#])`, 'i').test(text);
  });
}

function hasSection(text: string, headings: string[]): boolean {
  const alternatives = headings.map((heading) => heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return new RegExp(`(?:^|\\n)\\s*(?:${alternatives})\\s*(?::|\\n|$)`, 'i').test(text);
}

function extractRequirements(description: string, required: boolean): string[] {
  const lines = description.split(/\n+/).map((line) => line.trim().replace(/^[-*•]+\s*/, '')).filter(Boolean);
  let section: 'required' | 'preferred' | 'other' = 'other';
  const selected: string[] = [];
  for (const line of lines) {
    const heading = line.replace(/[:\s]+$/, '').toLowerCase();
    if (/^(required|minimum|basic) qualifications?$|^must[- ]have(?: skills?)?$|^what you(?:'|’)ll need$|^what you bring$/.test(heading)) {
      section = 'required';
      continue;
    }
    if (/^(preferred|desired) qualifications?$|^nice to have$|^bonus skills?$/.test(heading)) {
      section = 'preferred';
      continue;
    }
    if (/^(responsibilities|what you(?:'|’)ll do|about the role|about us|benefits|what we offer)$/.test(heading)) {
      section = 'other';
      continue;
    }
    const isRequired = section === 'required' || /\b(required|must have|must be|minimum|at least|need to|requirement)\b/i.test(line);
    const isPreferred = section === 'preferred' || /\b(preferred|nice to have|bonus|ideally|desirable)\b/i.test(line);
    if (required ? isRequired && !isPreferred : isPreferred && !isRequired) selected.push(line);
  }
  return [...new Set(selected.flatMap(findKeywords))].slice(0, 20);
}

function termCoverage(text: string, terms: string[]): Ranking['role'] {
  const matched = terms.filter((term) => containsTerm(text, term)).length;
  return { matched, total: terms.length, percentage: terms.length ? round((matched / terms.length) * 100) : 0 };
}

function buildRanking(text: string, targetRole?: string, jobDescription?: string, requirements?: Partial<ATSRequirements>): Ranking {
  const normalized = text.toLowerCase();
  const requiredTerms = [...new Set([...extractRequirements(jobDescription || '', true), ...(requirements?.requiredSkills ?? [])])];
  const preferredTerms = extractRequirements(jobDescription || '', false).filter((term) => !requiredTerms.includes(term));
  const roleTerms = findKeywords(targetRole || '').filter((term) => !requiredTerms.includes(term) && !preferredTerms.includes(term));
  const allJobTerms = findKeywords(jobDescription || '');
  const generalTerms = allJobTerms.filter((term) => !requiredTerms.includes(term) && !preferredTerms.includes(term) && !roleTerms.includes(term));
  const buckets = {
    required: termCoverage(normalized, requiredTerms),
    preferred: termCoverage(normalized, preferredTerms),
    general: termCoverage(normalized, generalTerms),
    role: termCoverage(normalized, roleTerms),
  };
  const configuredWeights = { required: 0.6, preferred: 0.2, general: 0.1, role: 0.1 };
  const activeWeight = (Object.keys(buckets) as Array<keyof typeof buckets>).reduce((sum, key) => sum + (buckets[key].total ? configuredWeights[key] : 0), 0);
  const weightedPercentage = activeWeight
    ? round((Object.keys(buckets) as Array<keyof typeof buckets>).reduce((sum, key) => sum + buckets[key].percentage * (buckets[key].total ? configuredWeights[key] : 0), 0) / activeWeight)
    : 0;
  return { ...buckets, weightedPercentage };
}

function experienceSection(text: string): string {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => /^(work experience|professional experience|employment history|experience)\s*:?$/i.test(line.trim()));
  if (start < 0) return '';
  const headings = /^(education|academic background|skills|technical skills|projects|certifications|awards|publications)\s*:?$/i;
  const endOffset = lines.slice(start + 1).findIndex((line) => headings.test(line.trim()));
  return lines.slice(start + 1, endOffset < 0 ? undefined : start + 1 + endOffset).join('\n');
}

function estimateExperienceYears(text: string): number | null {
  const currentYear = new Date().getFullYear();
  const ranges = [...text.matchAll(/\b((?:19|20)\d{2})\s*(?:-|–|—|to)\s*((?:19|20)\d{2}|present|current)\b/gi)];
  if (!ranges.length) return null;
  return Math.min(60, ranges.reduce((total, range) => {
    const from = Number(range[1]);
    const to = /present|current/i.test(range[2]) ? currentYear : Number(range[2]);
    return total + Math.max(0, to - from);
  }, 0));
}

function simulateStages(text: string, input: { targetRole?: string; jobDescription?: string; requirements?: Partial<ATSRequirements> }, parseIssues: string[]): Simulation {
  const normalized = text.toLowerCase();
  const ranking = buildRanking(text, input.targetRole, input.jobDescription, input.requirements);
  const required = [...new Set([...extractRequirements(input.jobDescription || '', true), ...(input.requirements?.requiredSkills ?? [])])];
  const preferred = extractRequirements(input.jobDescription || '', false).filter((term) => !required.includes(term));
  const requiredMatches = required.filter((term) => containsTerm(normalized, term));
  const requiredGaps = required.filter((term) => !containsTerm(normalized, term));
  const preferredMatches = preferred.filter((term) => containsTerm(normalized, term));
  const preferredGaps = preferred.filter((term) => !containsTerm(normalized, term));
  const roleTerms = findKeywords(input.targetRole || '');
  const emailFound = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text);
  const hasExperience = hasSection(text, ['experience', 'work experience', 'employment history', 'professional experience']);
  const educationRequired = required.some((term) => /\b(bachelor|master|degree|diploma|phd|doctorate)\b/i.test(term));
  const educationFound = hasSection(text, ['education', 'academic background']);
  const explicitRules: Simulation['explicitRules'] = [];
  const configuredSkills = input.requirements?.requiredSkills ?? [];
  const skillGaps = configuredSkills.filter((term) => !containsTerm(normalized, term));
  if (configuredSkills.length) explicitRules.push({ label: 'Required skills', status: skillGaps.length ? 'FAIL' : 'PASS', detail: skillGaps.length ? `Not found in resume text: ${skillGaps.join(', ')}.` : 'All configured skill terms were found.' });
  if (input.requirements?.minimumYearsExperience !== undefined) {
    const apparentYears = estimateExperienceYears(experienceSection(text));
    explicitRules.push({ label: 'Minimum experience', status: apparentYears === null ? 'REVIEW' : apparentYears >= input.requirements.minimumYearsExperience ? 'PASS' : 'FAIL', detail: apparentYears === null ? 'Could not infer employment dates; verify this requirement manually.' : `Approximate timeline spans ${apparentYears} years. This is a rough date-range estimate, not verified work experience.` });
  }
  if (input.requirements?.requiredEducation) {
    const found = containsTerm(normalized, input.requirements.requiredEducation);
    explicitRules.push({ label: 'Required education', status: found ? 'PASS' : 'REVIEW', detail: found ? `The text “${input.requirements.requiredEducation}” was found; credential validity is not verified.` : `The text “${input.requirements.requiredEducation}” was not found; equivalent credentials may be phrased differently, so verify manually.` });
  }
  if (input.requirements?.requiredLocation) {
    const found = containsTerm(normalized, input.requirements.requiredLocation);
    explicitRules.push({ label: 'Required location', status: found ? 'PASS' : 'REVIEW', detail: found ? 'The location text was found.' : 'The location was not found in resume text; location eligibility needs manual confirmation.' });
  }
  const hasExplicitFail = explicitRules.some((rule) => rule.status === 'FAIL');
  const hasInferredGaps = requiredGaps.length > 0;
  const stages: Simulation['stages'] = [
    { id: 'parse', label: 'Resume parsing', status: parseIssues.length ? 'REVIEW' : 'PASS', detail: parseIssues.length ? parseIssues.join(' ') : 'Contact details and standard resume sections were detected in extracted text.' },
    { id: 'knockout', label: 'Minimum qualifications', status: hasExplicitFail ? 'FAIL' : explicitRules.some((rule) => rule.status === 'REVIEW') || hasInferredGaps ? 'REVIEW' : explicitRules.some((rule) => rule.status === 'PASS') ? 'PASS' : 'REVIEW', detail: hasInferredGaps ? `${requiredMatches.length}/${required.length} terms inferred from job description criteria appear. Inferred term gaps are sent for review rather than treated as confirmed disqualification.` : required.length ? 'No inferred required-term gaps were found.' : 'No explicit required qualifications could be inferred from the job description.' },
    { id: 'experience', label: 'Experience screening', status: hasExperience ? 'PASS' : 'REVIEW', detail: hasExperience ? 'A work history section was detected; seniority and dates still require human review.' : 'A standard work experience section was not detected.' },
    { id: 'education', label: 'Education screening', status: educationRequired && !educationFound ? 'REVIEW' : educationFound ? 'PASS' : 'REVIEW', detail: educationRequired && !educationFound ? 'The job description appears to require education credentials, but no education section was detected.' : educationFound ? 'An education section was detected; credentials are not verified.' : 'Education requirements were not confidently machine-interpreted.' },
    { id: 'ranking', label: 'Weighted keyword ranking', status: ranking.weightedPercentage < 50 ? 'REVIEW' : 'PASS', detail: `${ranking.weightedPercentage}% weighted coverage: required ${ranking.required.percentage}% (60% weight), preferred ${ranking.preferred.percentage}% (20%), general job terms ${ranking.general.percentage}% (10%), target role ${ranking.role.percentage}% (10%). Available groups are renormalized.` },
    { id: 'contact', label: 'Recruiter handoff', status: emailFound ? 'PASS' : 'REVIEW', detail: emailFound ? 'An email address was detected for follow-up.' : 'No email address was detected in the extracted text.' },
  ];
  const hardFailure = hasExplicitFail;
  const reviewNeeded = stages.some((stage) => stage.status === 'REVIEW');
  return {
    stages,
    decision: hardFailure ? 'LIKELY_FILTERED' : reviewNeeded ? 'NEEDS_REVIEW' : 'LIKELY_ADVANCE',
    confidence: input.jobDescription || input.requirements && Object.values(input.requirements).some((value) => Array.isArray(value) ? value.length > 0 : value !== undefined) ? 'MEDIUM' : 'LOW',
    requiredMatches,
    requiredGaps,
    preferredMatches,
    preferredGaps,
    explicitRules,
    requirements: {
      requiredSkills: configuredSkills,
      minimumYearsExperience: input.requirements?.minimumYearsExperience,
      requiredEducation: input.requirements?.requiredEducation,
      requiredLocation: input.requirements?.requiredLocation,
    },
    ranking,
  };
}

function category(id: string, label: string, score: number, maxScore: number, findings: string[]): Category {
  return { id, label, score: round(score), maxScore, findings };
}

function toResult(doc: IResumeATSDocument): ResumeATSResult {
  return {
    id: doc._id.toString(),
    resumeId: doc.resumeId,
    version: doc.version,
    score: doc.score,
    targetRole: doc.targetRole,
    jobDescription: doc.jobDescription,
    hasJobDescription: doc.hasJobDescription,
    breakdown: doc.breakdown,
    interpretation: SCORE_INTERPRETATION,
    createdAt: doc.createdAt,
  };
}

export class ResumeATSService {
  async evaluateAndSave(input: {
    resumeId: string;
    version: number;
    extraction: IResumeExtractionDocument['parsedContent'];
    targetRole?: string;
    jobDescription?: string;
    requirements?: Partial<ATSRequirements>;
  }): Promise<ResumeATSResult> {
    const text = input.extraction.plainText ?? '';
    const normalizedText = text.toLowerCase();
    const words = wordCount(text);
    const hasConfiguredRequirements = Boolean(input.requirements && Object.values(input.requirements).some((value) => Array.isArray(value) ? value.length > 0 : value !== undefined));
    const targeted = Boolean(input.targetRole?.trim() || input.jobDescription?.trim() || hasConfiguredRequirements);
    const criteria = [input.targetRole?.trim(), input.jobDescription?.trim()].filter(Boolean).join('\n');
    const ranking = buildRanking(text, input.targetRole, input.jobDescription, input.requirements);
    const terms = [...new Set([...findKeywords(input.targetRole || ''), ...findKeywords(input.jobDescription || ''), ...(input.requirements?.requiredSkills ?? [])])];
    const matchedKeywords = terms.filter((term) => containsTerm(normalizedText, term));
    const missingKeywords = terms.filter((term) => !containsTerm(normalizedText, term));

    const hasSummary = hasSection(text, ['summary', 'professional summary', 'profile', 'objective']);
    const hasSkills = hasSection(text, ['skills', 'technical skills', 'core competencies', 'competencies']);
    const hasExperience = hasSection(text, ['experience', 'work experience', 'employment history', 'professional experience']);
    const hasProjects = hasSection(text, ['projects', 'selected projects', 'personal projects']);
    const hasEducation = hasSection(text, ['education', 'academic background']);
    const hasRelevantWork = hasExperience || hasProjects;

    const sectionFindings: string[] = [];
    if (!hasSummary) sectionFindings.push('Add a concise summary or objective near the top.');
    if (!hasSkills) sectionFindings.push('Add a clearly labeled skills section.');
    if (!hasRelevantWork) sectionFindings.push('Add a clearly labeled experience or projects section.');
    if (!hasEducation) sectionFindings.push('Consider adding a clearly labeled education section.');
    const sectionScore = (hasSummary ? 5 : 0) + (hasSkills ? 10 : 0) + (hasRelevantWork ? 10 : 0) + (hasEducation ? 5 : 0);

    const keywordFindings = terms.length === 0
      ? ['Add a target role or job description to measure role-specific keyword coverage.']
      : [
          `Weighted coverage: ${ranking.weightedPercentage}% (must-have 60%, preferred 20%, general job terms 10%, target role 10%, renormalized when a group is absent).`,
          `Must-have ${ranking.required.matched}/${ranking.required.total}; preferred ${ranking.preferred.matched}/${ranking.preferred.total}; general ${ranking.general.matched}/${ranking.general.total}; target-role ${ranking.role.matched}/${ranking.role.total}.`,
          ...(missingKeywords.length ? [`Review these missing terms where they accurately reflect your experience: ${missingKeywords.slice(0, 12).join(', ')}.`] : []),
        ];
    const keywordScore = terms.length ? (ranking.weightedPercentage / 100) * 35 : 0;

    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    const quantifiedLines = lines.filter((line) => /\d/.test(line) && line.length > 20);
    const impactMax = targeted ? 15 : 20;
    const impactScore = Math.min(impactMax, quantifiedLines.length * (impactMax / 3));
    const impactFindings = quantifiedLines.length
      ? [`Found ${quantifiedLines.length} lines containing measurable values; check that the numbers are accurate and provide useful context.`]
      : ['Where truthful, describe outcomes with scale, time saved, growth, volume, or other measurable results.'];

    let readabilityScore: number;
    let readabilityFinding: string;
    if (words >= 250 && words <= 1000) {
      readabilityScore = targeted ? 15 : 30;
      readabilityFinding = `Extracted ${words} words, within a broad resume length range.`;
    } else if (words >= 150 && words <= 1300) {
      readabilityScore = targeted ? 10 : 20;
      readabilityFinding = `Extracted ${words} words; review for concise, scannable content.`;
    } else {
      readabilityScore = targeted ? 5 : 10;
      readabilityFinding = words < 150
        ? `Only ${words} words were extracted. Confirm the file is text-based and includes the full resume.`
        : `Extracted ${words} words. Consider whether all content is relevant to the application.`;
    }

    const hasEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text);
    const hasPhone = /(?:\+?\d[\d().\s-]{7,}\d)/.test(text);
    const hasProfileLink = /(?:linkedin\.com|github\.com|portfolio|https?:\/\/)/i.test(text);
    const contactMax = targeted ? 5 : 20;
    const contactScore = (hasEmail ? contactMax * 0.4 : 0) + (hasPhone ? contactMax * 0.3 : 0) + (hasProfileLink ? contactMax * 0.3 : 0);
    const contactFindings: string[] = [];
    if (!hasEmail) contactFindings.push('Add a clearly formatted email address.');
    if (!hasPhone) contactFindings.push('Add a contact phone number if appropriate for your applications.');
    if (!hasProfileLink) contactFindings.push('Consider adding a relevant professional profile or portfolio link.');

    const parseIssues: string[] = [...(input.extraction.warnings ?? [])];
    if (!hasEmail) parseIssues.push('No email address detected.');
    if (!hasExperience) parseIssues.push('Work experience heading not detected.');
    if (!hasEducation) parseIssues.push('Education heading not detected.');
    if (words < 150) parseIssues.push('Very little text was extracted; confirm the file parsed completely.');
    const simulation = simulateStages(text, input, parseIssues);
    const categories = [
      category('sections', 'Section coverage', sectionScore, 30, sectionFindings.length ? sectionFindings : ['Common resume sections were detected.']),
      ...(targeted ? [category('keywords', 'Role keyword coverage', keywordScore, 35, keywordFindings)] : []),
      category('impact', 'Measurable evidence', impactScore, impactMax, impactFindings),
      category('readability', 'Text length', readabilityScore, targeted ? 15 : 30, [readabilityFinding]),
      category('contact', 'Contact details', contactScore, contactMax, contactFindings.length ? contactFindings : ['Email, phone, and a professional link were detected.']),
    ];
    const score = round(categories.reduce((total, item) => total + item.score, 0));
    const breakdown = {
      targeted,
      matchedKeywords,
      missingKeywords: missingKeywords.slice(0, 30),
      simulation,
      categories,
    };
    const criteriaHash = criteria || hasConfiguredRequirements
      ? createHash('sha256').update(JSON.stringify([criteria.toLowerCase(), input.requirements ?? {}])).digest('hex')
      : undefined;
    const doc = await ResumeATSModel.create({
      resumeId: input.resumeId,
      version: input.version,
      score,
      targetRole: input.targetRole?.trim() || undefined,
      jobDescription: input.jobDescription?.trim() || undefined,
      hasJobDescription: Boolean(input.jobDescription?.trim()),
      criteriaHash,
      breakdown,
      createdAt: new Date(),
    });
    return toResult(doc);
  }

  async list(resumeId: string, version: number): Promise<ResumeATSResult[]> {
    const docs = await ResumeATSModel.find({ resumeId, version }).sort({ createdAt: -1 }).limit(20);
    return docs.map(toResult);
  }
}
