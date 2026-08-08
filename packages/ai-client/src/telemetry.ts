import type { AIModelAlias, AIProviderName } from './contracts.js';

export interface AITelemetryEvent {
  requestId: string;
  executionId: string;
  task: string;
  provider: AIProviderName;
  modelAlias: AIModelAlias;
  status: 'SUCCESS' | 'FAILURE';
  latencyMs: number;
  retryCount: number;
  timestamp: Date;
}

export interface TelemetrySink {
  record(event: AITelemetryEvent): void | Promise<void>;
}

const noOpSink: TelemetrySink = { record: () => undefined };

export class Telemetry {
  constructor(private readonly sink: TelemetrySink = noOpSink) {}

  public record(event: AITelemetryEvent): void {
    try {
      void Promise.resolve(this.sink.record(event)).catch(() => undefined);
    } catch {
      // Telemetry must never alter AI execution outcomes.
    }
  }
}
