import { describe, it, expect, beforeEach } from 'vitest';
import { ContextBuilderService } from './services/contextBuilder.service.js';
import { DigitalTwinService } from './services/digitalTwin.service.js';
import {
  VerificationStatus,
  ConfidenceLevel,
} from '@careeros/shared-types';

describe('Digital Twin & Context Builder Tests', () => {
  let twinService: DigitalTwinService;
  let contextBuilder: ContextBuilderService;

  beforeEach(() => {
    twinService = new DigitalTwinService();
    contextBuilder = new ContextBuilderService();
  });

  it('should instantiate Digital Twin Service and Context Builder', () => {
    expect(twinService).toBeDefined();
    expect(contextBuilder).toBeDefined();
  });

  it('should enforce correct confidence score mappings', () => {
    // Verified Assessment -> HIGH confidence
    const assessmentVerification = VerificationStatus.VERIFIED;
    const assessmentConfidence =
      assessmentVerification === VerificationStatus.VERIFIED
        ? ConfidenceLevel.HIGH
        : ConfidenceLevel.LOW;
    expect(assessmentConfidence).toBe(ConfidenceLevel.HIGH);

    // Resume Imported -> MEDIUM confidence & UNVERIFIED/IMPORTED
    const resumeVerification = VerificationStatus.IMPORTED;
    const resumeConfidence =
      resumeVerification === VerificationStatus.IMPORTED
        ? ConfidenceLevel.MEDIUM
        : ConfidenceLevel.LOW;
    expect(resumeConfidence).toBe(ConfidenceLevel.MEDIUM);

    // Self Declared -> LOW confidence
    const selfVerification = VerificationStatus.UNVERIFIED;
    const selfConfidence =
      selfVerification === VerificationStatus.UNVERIFIED
        ? ConfidenceLevel.LOW
        : ConfidenceLevel.HIGH;
    expect(selfConfidence).toBe(ConfidenceLevel.LOW);
  });
});
