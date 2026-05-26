import { execFileSync } from "node:child_process";

import { DESIRED_REPO_SETTINGS } from "../policy/defaults.js";
import type { RulesetPayload } from "../policy/types.js";
import { parseRepo, parseRepos, parseRuleset, parseRulesetSummaries } from "./parse.js";
import type { GitHubErrorContext, GitHubRepo, GitHubRuleset, RulesetSummary } from "./types.js";

export class GitHubApiError extends Error {
  public readonly context: GitHubErrorContext;

  public constructor(context: GitHubErrorContext) {
    super(
      `${context.method} ${context.path} failed with ${String(context.status)}: ${context.body}`
    );
    this.context = context;
  }
}

export type GitHubClient = {
  getRepo(owner: string, repo: string): Promise<GitHubRepo>;
  listOrgRepos(org: string): Promise<GitHubRepo[]>;
  updateRepoDefaults(owner: string, repo: string): Promise<void>;
  listRepoRulesets(owner: string, repo: string): Promise<RulesetSummary[]>;
  getRepoRuleset(owner: string, repo: string, id: number): Promise<GitHubRuleset>;
  createRepoRuleset(owner: string, repo: string, payload: RulesetPayload): Promise<void>;
  updateRepoRuleset(
    owner: string,
    repo: string,
    id: number,
    payload: RulesetPayload
  ): Promise<void>;
};

export class RestGitHubClient implements GitHubClient {
  private readonly token: string;

  public constructor(token: string) {
    this.token = token;
  }

  public async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    return parseRepo(await this.request("GET", `/repos/${owner}/${repo}`));
  }

  public async listOrgRepos(org: string): Promise<GitHubRepo[]> {
    const repos: GitHubRepo[] = [];

    for (let page = 1; ; page += 1) {
      const path = `/orgs/${org}/repos?type=all&per_page=100&page=${String(page)}`;
      const pageRepos = parseRepos(await this.request("GET", path));
      repos.push(...pageRepos);

      if (pageRepos.length < 100) {
        return repos;
      }
    }
  }

  public async updateRepoDefaults(owner: string, repo: string): Promise<void> {
    await this.request("PATCH", `/repos/${owner}/${repo}`, DESIRED_REPO_SETTINGS);
  }

  public async listRepoRulesets(owner: string, repo: string): Promise<RulesetSummary[]> {
    return parseRulesetSummaries(
      await this.request("GET", `/repos/${owner}/${repo}/rulesets?includes_parents=false`)
    );
  }

  public async getRepoRuleset(owner: string, repo: string, id: number): Promise<GitHubRuleset> {
    return parseRuleset(
      await this.request("GET", `/repos/${owner}/${repo}/rulesets/${String(id)}`)
    );
  }

  public async createRepoRuleset(
    owner: string,
    repo: string,
    payload: RulesetPayload
  ): Promise<void> {
    await this.request("POST", `/repos/${owner}/${repo}/rulesets`, payload);
  }

  public async updateRepoRuleset(
    owner: string,
    repo: string,
    id: number,
    payload: RulesetPayload
  ): Promise<void> {
    await this.request("PUT", `/repos/${owner}/${repo}/rulesets/${String(id)}`, payload);
  }

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const init: RequestInit = {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    };

    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const response = await fetch(`https://api.github.com${path}`, init);

    if (!response.ok) {
      throw new GitHubApiError({
        method,
        path,
        status: response.status,
        body: await response.text()
      });
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }
}

export function resolveToken(explicitToken?: string): string {
  const token = explicitToken ?? process.env["GITHUB_TOKEN"] ?? process.env["GH_TOKEN"];

  if (token !== undefined && token.trim().length > 0) {
    return token.trim();
  }

  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
  } catch {
    throw new Error("GitHub token not found. Set GITHUB_TOKEN or run gh auth login.");
  }
}
