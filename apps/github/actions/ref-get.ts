import type { ActionDefinition } from "@w6w/types";
import { contentsPath, GitHubClient, repoPath } from "../lib/client.ts";
import { owner, repository } from "../lib/params.ts";

const refGet: ActionDefinition<{ owner: string; repository: string; branch: string }> = {
  key: "ref-get",
  type: "read",
  resource: "repository",
  title: "Get Branch Head",
  description: "Fetch a branch's head commit SHA in one call.",
  params: [owner, repository, {
    key: "branch",
    label: "Branch",
    type: "string",
    required: true,
    hint: "Branch name without the `refs/heads/` prefix, e.g. `main`.",
  }],
  output: [
    { key: "ref", type: "string", label: "Ref" },
    { key: "object", type: "object", label: "Target object ({ sha, type, url })" },
  ],

  execute(input, ctx) {
    return new GitHubClient(ctx).request(
      `/repos/${repoPath(input.owner, input.repository)}/git/ref/${
        contentsPath(`heads/${input.branch}`)
      }`,
    );
  },
};

export default refGet;
