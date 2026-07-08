import { afterEach, describe, expect, it, vi } from "vitest";

import { RestGitHubClient } from "../src/github/client.js";
import { DESIRED_REPO_SETTINGS } from "../src/policy/defaults.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RestGitHubClient.listOwnerRepos", () => {
  it("lists organization repositories through the organization endpoint", async () => {
    const requests = stubFetch(
      new Map<string, unknown>([
        ["https://api.github.com/users/dutifuldev", { type: "Organization" }],
        [
          "https://api.github.com/orgs/dutifuldev/repos?type=all&per_page=100",
          [repoListItem("dutifuldev", "scratch")]
        ],
        [
          "https://api.github.com/orgs/dutifuldev/repos?type=all&per_page=100&page=2",
          [repoListItem("dutifuldev", "tools")]
        ],
        ["https://api.github.com/repos/dutifuldev/tools", repo("dutifuldev", "tools")],
        ["https://api.github.com/repos/dutifuldev/scratch", repo("dutifuldev", "scratch")]
      ]),
      new Map<string, Record<string, string>>([
        [
          "https://api.github.com/orgs/dutifuldev/repos?type=all&per_page=100",
          {
            link: '<https://api.github.com/orgs/dutifuldev/repos?type=all&per_page=100&page=2>; rel="next"'
          }
        ]
      ])
    );

    await expect(new RestGitHubClient("token").listOwnerRepos("dutifuldev")).resolves.toEqual([
      repo("dutifuldev", "scratch"),
      repo("dutifuldev", "tools")
    ]);
    expect(requests).toEqual([
      "https://api.github.com/users/dutifuldev",
      "https://api.github.com/orgs/dutifuldev/repos?type=all&per_page=100",
      "https://api.github.com/orgs/dutifuldev/repos?type=all&per_page=100&page=2",
      "https://api.github.com/repos/dutifuldev/scratch",
      "https://api.github.com/repos/dutifuldev/tools"
    ]);
  });

  it("lists user-owned repositories through the authenticated user endpoint", async () => {
    const requests = stubFetch(
      new Map<string, unknown>([
        ["https://api.github.com/users/osolmaz", { type: "User" }],
        [
          "https://api.github.com/user/repos?visibility=all&affiliation=owner,collaborator&per_page=100",
          [repoListItem("osolmaz", "brokerkit"), repoListItem("dutifuldev", "tools")]
        ],
        [
          "https://api.github.com/user/repos?visibility=all&affiliation=owner,collaborator&per_page=100&page=2",
          [repoListItem("osolmaz", "sudo-broker")]
        ],
        ["https://api.github.com/repos/osolmaz/sudo-broker", repo("osolmaz", "sudo-broker")],
        ["https://api.github.com/repos/osolmaz/brokerkit", repo("osolmaz", "brokerkit")]
      ]),
      new Map<string, Record<string, string>>([
        [
          "https://api.github.com/user/repos?visibility=all&affiliation=owner,collaborator&per_page=100",
          {
            link: '<https://api.github.com/user/repos?visibility=all&affiliation=owner,collaborator&per_page=100&page=2>; rel="next"'
          }
        ]
      ])
    );

    await expect(new RestGitHubClient("token").listOwnerRepos("osolmaz")).resolves.toEqual([
      repo("osolmaz", "brokerkit"),
      repo("osolmaz", "sudo-broker")
    ]);
    expect(requests).toEqual([
      "https://api.github.com/users/osolmaz",
      "https://api.github.com/user/repos?visibility=all&affiliation=owner,collaborator&per_page=100",
      "https://api.github.com/user/repos?visibility=all&affiliation=owner,collaborator&per_page=100&page=2",
      "https://api.github.com/repos/osolmaz/brokerkit",
      "https://api.github.com/repos/osolmaz/sudo-broker"
    ]);
  });
});

function stubFetch(
  responses: Map<string, unknown>,
  headers = new Map<string, Record<string, string>>()
): string[] {
  const requests: string[] = [];
  const fetchMock: typeof fetch = (input) => {
    const url = requestUrl(input);
    requests.push(url);

    if (!responses.has(url)) {
      return Promise.resolve(new Response("not found", { status: 404 }));
    }

    return Promise.resolve(jsonResponse(responses.get(url), headers.get(url)));
  };

  vi.stubGlobal("fetch", fetchMock);
  return requests;
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}

function jsonResponse(body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json", ...headers },
    status: 200
  });
}

function repoListItem(owner: string, name: string): unknown {
  return { name, full_name: `${owner}/${name}`, owner: { login: owner } };
}

function repo(owner: string, name: string): unknown {
  return {
    ...DESIRED_REPO_SETTINGS,
    name,
    full_name: `${owner}/${name}`,
    archived: false,
    disabled: false,
    default_branch: "main"
  };
}
