import { execFileSync } from "node:child_process";

import { DESIRED_REPO_SETTINGS } from "../policy/defaults.js";
import type { RulesetPayload } from "../policy/types.js";
import {
  parseOwnerType,
  parseRepo,
  parseRepoListItems,
  parseRepoNames,
  parseRuleset,
  parseRulesetSummaries
} from "./parse.js";
import type { GitHubErrorContext, GitHubRepo, GitHubRuleset, RulesetSummary } from "./types.js";

type GitHubResponse = {
  body: unknown;
  headers: Headers;
};

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
  listOwnerRepos(owner: string): Promise<GitHubRepo[]>;
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

  public async listOwnerRepos(owner: string): Promise<GitHubRepo[]> {
    const ownerType = parseOwnerType(await this.request("GET", `/users/${owner}`));

    if (ownerType === "Organization") {
      return this.listOrganizationRepos(owner);
    }

    return this.listUserOwnedRepos(owner);
  }

  private async listOrganizationRepos(org: string): Promise<GitHubRepo[]> {
    const repoNames = await this.paginate(
      `/orgs/${org}/repos?type=all&per_page=100`,
      parseRepoNames
    );

    return Promise.all(repoNames.map((repo) => this.getRepo(org, repo)));
  }

  private async listUserOwnedRepos(owner: string): Promise<GitHubRepo[]> {
    const normalizedOwner = owner.toLowerCase();
    const repoItems = await this.paginate(
      "/user/repos?visibility=all&affiliation=owner,collaborator&per_page=100",
      parseRepoListItems
    );
    const ownedRepoNames = repoItems
      .filter((repo) => repo.owner_login.toLowerCase() === normalizedOwner)
      .map((repo) => repo.name);

    return Promise.all(ownedRepoNames.map((repo) => this.getRepo(owner, repo)));
  }

  public async updateRepoDefaults(owner: string, repo: string): Promise<void> {
    await this.request("PATCH", `/repos/${owner}/${repo}`, DESIRED_REPO_SETTINGS);
  }

  public async listRepoRulesets(owner: string, repo: string): Promise<RulesetSummary[]> {
    return this.paginate(
      `/repos/${owner}/${repo}/rulesets?includes_parents=false&per_page=100`,
      parseRulesetSummaries
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

  private async paginate<T>(firstPath: string, parseItems: (value: unknown) => T[]): Promise<T[]> {
    const items: T[] = [];
    let path: string | undefined = firstPath;

    while (path !== undefined) {
      const response = await this.requestWithHeaders("GET", path);
      items.push(...parseItems(response.body));
      path = nextPagePath(response.headers.get("link"));
    }

    return items;
  }

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    return (await this.requestWithHeaders(method, path, body)).body;
  }

  private async requestWithHeaders(
    method: string,
    path: string,
    body?: unknown
  ): Promise<GitHubResponse> {
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
      return { body: null, headers: response.headers };
    }

    return { body: await response.json(), headers: response.headers };
  }
}

function nextPagePath(linkHeader: string | null): string | undefined {
  if (linkHeader === null) {
    return undefined;
  }

  for (const link of linkHeader.split(/,\s*(?=<)/)) {
    const match = /^<([^>]+)>(.*)$/.exec(link.trim());

    if (match?.[1] === undefined || match[2] === undefined) {
      continue;
    }

    const params = match[2]
      .split(";")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    if (!params.includes('rel="next"')) {
      continue;
    }

    const url = new URL(match[1]);
    return `${url.pathname}${url.search}`;
  }

  return undefined;
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
