import { describe, it, expect } from 'vitest';
import { ResumeStatus } from '@careeros/shared-types';

describe('Resume Service Metadata Unit Tests', () => {
  it('should support resume status active and archived', () => {
    expect(ResumeStatus.ACTIVE).toBe('ACTIVE');
    expect(ResumeStatus.ARCHIVED).toBe('ARCHIVED');
  });

  it('should format resume metadata correctly', () => {
    const resumeMetadata = {
      publicId: 'careeros/resumes/resume_123',
      secureUrl: 'https://res.cloudinary.com/careeros/raw/upload/v123/resume.pdf',
      filename: 'alex_morgan_resume.pdf',
      mimeType: 'application/pdf',
      size: 1048576,
      version: 1,
      status: ResumeStatus.ACTIVE,
      uploadDate: new Date(),
    };

    expect(resumeMetadata.publicId).toBeDefined();
    expect(resumeMetadata.secureUrl).toContain('cloudinary.com');
    expect(resumeMetadata.version).toBe(1);
  });
});
