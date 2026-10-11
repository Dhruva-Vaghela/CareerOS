import { config } from '../config.js';
import { createLogger } from '@careeros/logger';
import { BadRequestError, NotFoundError } from '@careeros/errors';

const logger = createLogger('projects-github-service');

export interface GithubRepoRaw {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  homepage: string | null;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language: string | null;
  forks_count: number;
  open_issues_count: number;
  topics?: string[];
  default_branch: string;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
    html_url: string;
  };
}

export interface GithubUserProfile {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
}

export class GithubService {
  private getHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'CareerOS-Project-Intelligence',
      Accept: 'application/vnd.github.v3+json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  public getOAuthAuthorizeUrl(state?: string): string {
    if (!config.GITHUB_CLIENT_ID) {
      throw new BadRequestError('GITHUB_CLIENT_ID is not configured in .env');
    }

    const params = new URLSearchParams({
      client_id: config.GITHUB_CLIENT_ID,
      redirect_uri: config.GITHUB_CALLBACK_URL,
      scope: 'read:user,public_repo',
    });

    if (state) {
      params.append('state', state);
    }

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  public async exchangeCodeForToken(code: string): Promise<string> {
    if (!config.GITHUB_CLIENT_ID || !config.GITHUB_CLIENT_SECRET) {
      throw new BadRequestError('GitHub Client ID or Secret is not configured');
    }

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'CareerOS-Project-Intelligence',
      },
      body: JSON.stringify({
        client_id: config.GITHUB_CLIENT_ID,
        client_secret: config.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: config.GITHUB_CALLBACK_URL,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error({ status: response.status, errText }, 'GitHub token exchange HTTP error');
      throw new BadRequestError('Failed to exchange code with GitHub');
    }

    const data = (await response.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (data.error || !data.access_token) {
      logger.error({ error: data.error, desc: data.error_description }, 'GitHub OAuth error response');
      throw new BadRequestError(data.error_description || data.error || 'Failed to obtain access token from GitHub');
    }

    return data.access_token;
  }

  public async fetchAuthenticatedUser(token: string): Promise<GithubUserProfile> {
    const response = await fetch('https://api.github.com/user', {
      headers: this.getHeaders(token),
    });

    if (!response.ok) {
      throw new BadRequestError('Failed to fetch authenticated GitHub user profile');
    }

    return (await response.json()) as GithubUserProfile;
  }

  public async fetchUserProfile(username: string, token?: string): Promise<GithubUserProfile> {
    const cleanUsername = username.trim().replace(/^@/, '');
    const response = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUsername)}`, {
      headers: this.getHeaders(token),
    });

    if (response.status === 404) {
      throw new NotFoundError(`GitHub user '${cleanUsername}' was not found`);
    }

    if (!response.ok) {
      const errText = await response.text();
      logger.error({ status: response.status, errText }, 'Failed to fetch GitHub user');
      throw new BadRequestError(`GitHub API error: ${response.statusText}`);
    }

    return (await response.json()) as GithubUserProfile;
  }

  public async fetchPublicRepositories(username: string, token?: string): Promise<GithubRepoRaw[]> {
    const cleanUsername = username.trim().replace(/^@/, '');
    // Fetch up to 100 repositories, sorted by most recently updated
    const url = `https://api.github.com/users/${encodeURIComponent(cleanUsername)}/repos?per_page=100&sort=updated&type=public`;

    logger.info({ username: cleanUsername }, 'Fetching public repositories from GitHub');

    const response = await fetch(url, {
      headers: this.getHeaders(token),
    });

    if (response.status === 404) {
      throw new NotFoundError(`GitHub user '${cleanUsername}' was not found`);
    }

    if (!response.ok) {
      const errText = await response.text();
      logger.error({ status: response.status, errText }, 'GitHub fetch repos failed');
      throw new BadRequestError(`Failed to fetch repositories from GitHub (${response.status})`);
    }

    const repos = (await response.json()) as GithubRepoRaw[];
    return repos.filter((r) => !r.private);
  }
}

export const githubService = new GithubService();
