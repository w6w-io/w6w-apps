import type { ActionDefinition } from "@w6w/types";
import { CursorClient } from "../lib/client.ts";

interface RepoBlocklist {
  id: string;
  url: string;
  patterns: string[];
}

interface RepoBlocklistsResponse {
  repos: RepoBlocklist[];
}

/**
 * `GET /settings/repo-blocklists/repos` — repositories with context-blocking
 * patterns configured, so files matching a glob pattern (`*.env`, `secrets/**`)
 * are never pulled into Cursor's context for that repo.
 */
const repoBlocklistList: ActionDefinition<Record<string, never>> = {
  key: "repo-blocklist-list",
  type: "read",
  resource: "repo-blocklist",
  title: "Get Team Repo Blocklists",
  description:
    "Retrieve all repository blocklists configured for your team — repositories and glob " +
    "patterns preventing matching files from being used as AI context.",
  params: [],
  output: [
    { key: "repos", type: "array", label: "Repository blocklists" },
  ],

  async execute(_input, ctx) {
    const body = await new CursorClient(ctx).get<RepoBlocklistsResponse>(
      "/settings/repo-blocklists/repos",
    );
    return { repos: body.repos ?? [] };
  },
};

export default repoBlocklistList;
