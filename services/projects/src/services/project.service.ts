import {
  ProjectModel,
  ProjectGithubAccountModel,
  ProjectBriefModel,
  ProjectSubmissionModel,
  IProjectDocument,
  IProjectGithubAccountDocument,
} from '../db/schema.js';
import { githubService } from './github.service.js';
import { eventBus } from '../bus.js';
import { NotFoundError, BadRequestError } from '@careeros/errors';
import { createLogger } from '@careeros/logger';
import { ProjectStatus, ProjectSubmittedEvent } from '@careeros/shared-types';

const logger = createLogger('projects-service');

export class ProjectService {
  public async getProjects(
    userId: string,
    filters?: { search?: string; language?: string; status?: string },
  ): Promise<IProjectDocument[]> {
    const account = await this.getGithubAccount(userId);
    if (!account) {
      await ProjectModel.deleteMany({ userId }).exec();
      return [];
    }

    const query: Record<string, any> = { userId };

    if (filters?.language && filters.language !== 'ALL') {
      query.language = filters.language;
    }

    if (filters?.status && filters.status !== 'ALL') {
      query.status = filters.status;
    }

    if (filters?.search && filters.search.trim()) {
      const term = filters.search.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
        { language: { $regex: term, $options: 'i' } },
      ];
    }

    return ProjectModel.find(query).sort({ updatedAt: -1, stars: -1 }).exec();
  }

  public async getGithubAccount(userId: string): Promise<IProjectGithubAccountDocument | null> {
    return ProjectGithubAccountModel.findOne({ userId }).exec();
  }

  public async connectAndSyncByUsername(
    userId: string,
    username: string,
  ): Promise<{ account: IProjectGithubAccountDocument; projects: IProjectDocument[] }> {
    const profile = await githubService.fetchUserProfile(username);
    const repos = await githubService.fetchPublicRepositories(username);

    const account = await ProjectGithubAccountModel.findOneAndUpdate(
      { userId },
      {
        userId,
        githubUsername: profile.login,
        githubUserId: profile.id,
        avatarUrl: profile.avatar_url,
        profileUrl: profile.html_url,
        publicRepoCount: repos.length,
        lastSyncedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();

    await this.upsertRepositories(userId, profile.login, repos);
    const projects = await this.getProjects(userId);

    logger.info({ userId, username: profile.login, count: projects.length }, 'Successfully synced GitHub repositories');

    return { account, projects };
  }

  public async connectAndSyncByOAuth(
    userId: string,
    code: string,
  ): Promise<{ account: IProjectGithubAccountDocument; projects: IProjectDocument[] }> {
    const token = await githubService.exchangeCodeForToken(code);
    const profile = await githubService.fetchAuthenticatedUser(token);
    const repos = await githubService.fetchPublicRepositories(profile.login, token);

    const account = await ProjectGithubAccountModel.findOneAndUpdate(
      { userId },
      {
        userId,
        githubUsername: profile.login,
        githubUserId: profile.id,
        avatarUrl: profile.avatar_url,
        profileUrl: profile.html_url,
        accessToken: token,
        publicRepoCount: repos.length,
        lastSyncedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();

    await this.upsertRepositories(userId, profile.login, repos);
    const projects = await this.getProjects(userId);

    logger.info({ userId, username: profile.login, count: projects.length }, 'OAuth GitHub sync complete');

    return { account, projects };
  }

  public async syncExistingAccount(
    userId: string,
  ): Promise<{ account: IProjectGithubAccountDocument; projects: IProjectDocument[] }> {
    const account = await this.getGithubAccount(userId);
    if (!account) {
      throw new BadRequestError('No GitHub account connected for this user');
    }

    const repos = await githubService.fetchPublicRepositories(
      account.githubUsername,
      account.accessToken,
    );

    account.publicRepoCount = repos.length;
    account.lastSyncedAt = new Date();
    await account.save();

    await this.upsertRepositories(userId, account.githubUsername, repos);
    const projects = await this.getProjects(userId);

    return { account, projects };
  }

  public async disconnectAccount(userId: string): Promise<void> {
    await ProjectGithubAccountModel.deleteOne({ userId }).exec();
    await ProjectModel.deleteMany({ userId }).exec();
  }

  public async updateProject(
    userId: string,
    projectId: string,
    updates: { description?: string; status?: 'Completed' | 'In Progress' | 'Active' | 'Archived' },
  ): Promise<IProjectDocument> {
    const project = await ProjectModel.findOne({ _id: projectId, userId }).exec();
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    if (typeof updates.description === 'string') {
      project.description = updates.description.trim();
    }

    if (updates.status) {
      project.status = updates.status;
    }

    project.updatedAt = new Date();
    await project.save();
    return project;
  }

  public async deleteProject(userId: string, projectId: string): Promise<void> {
    const res = await ProjectModel.deleteOne({ _id: projectId, userId }).exec();
    if (res.deletedCount === 0) {
      throw new NotFoundError('Project not found');
    }
  }

  private async upsertRepositories(
    userId: string,
    _ownerLogin: string,
    repos: import('./github.service.js').GithubRepoRaw[],
  ): Promise<void> {
    for (const repo of repos) {
      await ProjectModel.findOneAndUpdate(
        { userId, githubRepoId: repo.id },
        {
          userId,
          githubRepoId: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description || '',
          repositoryUrl: repo.html_url,
          language: repo.language || null,
          topics: repo.topics || [],
          stars: repo.stargazers_count || 0,
          forks: repo.forks_count || 0,
          isPublic: !repo.private,
          defaultBranch: repo.default_branch || 'main',
          lastSyncedAt: new Date(),
          $setOnInsert: {
            status: 'Completed',
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).exec();
    }
  }

  // Architecture §12 Domain Methods
  public async getSuggestedBriefs(moduleId?: string) {
    const filter = moduleId ? { moduleId } : {};
    return ProjectBriefModel.find(filter).exec();
  }

  public async submitProject(userId: string, projectBriefId: string, submissionUrl: string) {
    // Validate submission URL to avoid stored XSS per architecture §12.10
    try {
      const parsed = new URL(submissionUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      throw new BadRequestError('Invalid submission URL. Must be a valid http or https URL.');
    }

    const submission = await ProjectSubmissionModel.create({
      userId,
      projectBriefId,
      submissionUrl,
      status: ProjectStatus.SUBMITTED,
      submittedAt: new Date(),
    });

    // Publish event project.submitted per architecture §12.7
    const event: ProjectSubmittedEvent = {
      name: 'project.submitted',
      metadata: {
        eventId: submission._id.toString(),
        timestamp: new Date().toISOString(),
        traceId: `trace-${Date.now()}`,
        userId,
      },
      payload: {
        userId,
        projectId: submission._id.toString(),
        projectBriefId,
        title: 'Project Submission',
        submissionUrl,
        status: ProjectStatus.SUBMITTED,
        submittedAt: new Date().toISOString(),
      },
    };

    await eventBus.publish(event);

    return submission;
  }
}

export const projectService = new ProjectService();
