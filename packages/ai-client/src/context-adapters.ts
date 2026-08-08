import type {
  ContextAdapter,
  ContextAdapterOptions,
  ContextSourceKey,
} from './context-contracts.js';

type ContextRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ContextRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pick(value: unknown, fields: readonly string[]): ContextRecord {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    fields.flatMap((field) => (value[field] === undefined ? [] : [[field, value[field]]])),
  );
}

abstract class BaseContextAdapter implements ContextAdapter {
  public abstract readonly source: ContextSourceKey;

  public abstract adapt(value: unknown, options?: ContextAdapterOptions): unknown;
}

export class ProfileContextAdapter extends BaseContextAdapter {
  public readonly source = 'profile' as const;

  public adapt(value: unknown): ContextRecord {
    return pick(value, [
      'targetRole',
      'degree',
      'branch',
      'currentSemester',
      'graduationYear',
      'currentStatus',
      'experienceLevel',
      'availabilityHours',
      'availabilityTimeframe',
      'interests',
      'profileCompleted',
    ]);
  }
}

export class CareerGoalContextAdapter extends BaseContextAdapter {
  public readonly source = 'careerGoal' as const;

  public adapt(value: unknown): ContextRecord {
    return pick(value, ['targetRole', 'targetCompanies', 'targetTimeline', 'customTimeline', 'status']);
  }
}

export class DigitalTwinContextAdapter extends BaseContextAdapter {
  public readonly source = 'digitalTwin' as const;

  public adapt(value: unknown, options: ContextAdapterOptions = {}): ContextRecord {
    if (!isRecord(value)) return {};
    const partitions = options.digitalTwinPartitions ?? [];
    return pick(value, partitions);
  }
}

export class ResumeContextAdapter extends BaseContextAdapter {
  public readonly source = 'resume' as const;

  public adapt(value: unknown): ContextRecord {
    return pick(value, ['summary', 'skills', 'experience', 'education', 'status', 'version']);
  }
}

export class ProjectsContextAdapter extends BaseContextAdapter {
  public readonly source = 'projects' as const;

  public adapt(value: unknown): unknown {
    if (!Array.isArray(value)) return [];
    return value.map((project) =>
      pick(project, ['title', 'description', 'technologies', 'outcome', 'status']),
    );
  }
}

export class LearningContextAdapter extends BaseContextAdapter {
  public readonly source = 'learning' as const;

  public adapt(value: unknown): ContextRecord {
    return pick(value, ['currentModule', 'completedTopics', 'progress', 'pace', 'weakConcepts']);
  }
}

export class AssessmentContextAdapter extends BaseContextAdapter {
  public readonly source = 'assessment' as const;

  public adapt(value: unknown): ContextRecord {
    return pick(value, ['recentScores', 'strengths', 'weakConcepts']);
  }
}

export class InterviewContextAdapter extends BaseContextAdapter {
  public readonly source = 'interview' as const;

  public adapt(value: unknown): ContextRecord {
    return pick(value, ['mode', 'performance', 'feedback', 'weakAreas']);
  }
}

export class ContextAdapters {
  private readonly adapters: ReadonlyMap<ContextSourceKey, ContextAdapter>;

  constructor(adapters: readonly ContextAdapter[] = ContextAdapters.defaultAdapters()) {
    this.adapters = new Map(adapters.map((adapter) => [adapter.source, adapter]));
  }

  public adapt(
    source: ContextSourceKey,
    value: unknown,
    options?: ContextAdapterOptions,
  ): unknown {
    return this.adapters.get(source)?.adapt(value, options) ?? value;
  }

  private static defaultAdapters(): readonly ContextAdapter[] {
    return [
      new ProfileContextAdapter(),
      new CareerGoalContextAdapter(),
      new DigitalTwinContextAdapter(),
      new ResumeContextAdapter(),
      new ProjectsContextAdapter(),
      new LearningContextAdapter(),
      new AssessmentContextAdapter(),
      new InterviewContextAdapter(),
    ];
  }
}
