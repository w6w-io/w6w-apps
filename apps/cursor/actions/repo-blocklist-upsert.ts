import type { ActionDefinition } from "@w6w/types";
import { CursorClient } from "../lib/client.ts";

interface RepoUpsertInput {
  url: string;
  patterns: string[];
}

interface Input {
  repos: RepoUpsertInput[] | string;
}

interface RepoBlocklist {
  id: string;
  url: string;
  patterns: string[];
}

interface RepoBlocklistsResponse {
  repos: RepoBlocklist[];
}

/**
 * `POST /settings/repo-blocklists/repos/upsert` — replace a repo's blocklist
 * patterns.
 *
 * The doc is explicit that this only overwrites the patterns for the
 * **repos provided** — every other repo's blocklist is left untouched, so
 * this is a per-repo replace, not a wholesale reset of the team's blocklist
 * configuration.
 */
const repoBlocklistUpsert: ActionDefinition<Input> = {
  key: "repo-blocklist-upsert",
  type: "perform",
  resource: "repo-blocklist",
  title: "Upsert Repo Blocklists",
  description:
    "Replace the blocklist patterns for the given repositories. Repositories not included are " +
    "left unaffected.",
  idempotent: true,
  params: [
    {
      key: "repos",
      label: "Repos",
      type: "json",
      required: true,
      hint: 'Array of { "url": string, "patterns": string[] } objects. Patterns support glob ' +
        'syntax, e.g. "*.env", "config/*", "secrets/**".',
    },
  ],
  output: [
    { key: "repos", type: "array", label: "Updated repository blocklists" },
  ],

  async execute(input, ctx) {
    const repos = typeof input.repos === "string" ? JSON.parse(input.repos) : input.repos;
    if (!Array.isArray(repos) || repos.length === 0) {
      throw new Error("repos must be a non-empty array");
    }
    const body = await new CursorClient(ctx).post<RepoBlocklistsResponse>(
      "/settings/repo-blocklists/repos/upsert",
      { repos },
    );
    return { repos: body.repos ?? [] };
  },
};

export default repoBlocklistUpsert;
