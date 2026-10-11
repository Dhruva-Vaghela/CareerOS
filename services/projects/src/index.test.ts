import { describe, it, expect, vi, beforeEach } from 'vitest';
import { githubService } from './services/github.service.js';
import { ProjectStatus } from '@careeros/shared-types';
import { projectService } from './services/project.service.js';
import { ProjectModel, ProjectSubmissionModel, ProjectGithubAccountModel } from './db/schema.js';
import { eventBus } from './bus.js';

describe('Project Intelligence Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate valid GitHub OAuth authorize URL with client ID', () => {
    const url = githubService.getOAuthAuthorizeUrl('test-state-123');
    expect(url).toContain('https://github.com/login/oauth/authorize');
    expect(url).toContain('client_id=');
    expect(url).toContain('state=test-state-123');
    expect(url).toContain('scope=read%3Auser%2Cpublic_repo');
  });

  it('should parse and map public repositories correctly', async () => {
    const mockRepos = [
      {
        id: 12345,
        name: 'CareerOS',
        full_name: 'Yesha0405/CareerOS',
        private: false,
        html_url: 'https://github.com/Yesha0405/CareerOS',
        description: 'AI-powered career operating system',
        fork: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-02-01T00:00:00Z',
        pushed_at: '2026-02-01T00:00:00Z',
        homepage: null,
        size: 500,
        stargazers_count: 12,
        watchers_count: 12,
        language: 'TypeScript',
        forks_count: 3,
        open_issues_count: 0,
        topics: ['ai', 'typescript'],
        default_branch: 'main',
        owner: {
          login: 'Yesha0405',
          id: 999,
          avatar_url: 'https://avatars.githubusercontent.com/u/999',
          html_url: 'https://github.com/Yesha0405',
        },
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => mockRepos,
      } as any;
    });

    const repos = await githubService.fetchPublicRepositories('Yesha0405');
    expect(repos).toHaveLength(1);
    expect(repos[0].name).toBe('CareerOS');
    expect(repos[0].language).toBe('TypeScript');
    expect(repos[0].private).toBe(false);
  });

  it('should filter out private repositories if any appear', async () => {
    const mockRepos = [
      {
        id: 1,
        name: 'public-repo',
        private: false,
      },
      {
        id: 2,
        name: 'secret-repo',
        private: true,
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => mockRepos,
      } as any;
    });

    const repos = await githubService.fetchPublicRepositories('testuser');
    expect(repos).toHaveLength(1);
    expect(repos[0].name).toBe('public-repo');
  });

  it('should validate submission URLs and reject invalid schemes (Security §12.10)', async () => {
    await expect(
      projectService.submitProject('user-1', 'brief-1', 'javascript:alert(1)'),
    ).rejects.toThrow('Invalid submission URL');
  });

  it('should publish project.submitted event on valid submission (Architecture §12.7)', async () => {
    const publishSpy = vi.spyOn(eventBus, 'publish').mockResolvedValue(undefined as any);
    vi.spyOn(ProjectSubmissionModel, 'create').mockResolvedValue({
      _id: 'sub-123',
      userId: 'user-1',
      projectBriefId: 'brief-1',
      submissionUrl: 'https://github.com/user/demo',
      status: ProjectStatus.SUBMITTED,
      submittedAt: new Date(),
    } as any);

    const submission = await projectService.submitProject(
      'user-1',
      'brief-1',
      'https://github.com/user/demo',
    );

    expect(submission._id).toBe('sub-123');
    expect(publishSpy).toHaveBeenCalledTimes(1);
    const publishedCall = publishSpy.mock.calls[0][0];
    expect(publishedCall.name).toBe('project.submitted');
    expect(publishedCall.payload.userId).toBe('user-1');
  });

  it('should validate project status options', () => {
    expect(ProjectStatus.SUBMITTED).toBe('SUBMITTED');
    expect(ProjectStatus.VERIFIED).toBe('VERIFIED');
  });
});
