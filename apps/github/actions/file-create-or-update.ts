import type { ActionDefinition } from "@w6w/types";
import { contentsPath, GitHubClient, repoPath, unset } from "../lib/client.ts";
import { owner, repository } from "../lib/params.ts";

interface Input {
  owner: string;
  repository: string;
  filePath: string;
  content: string;
  commitMessage: string;
  sha?: string;
  branch?: string;
}

/**
 * GitHub has one endpoint for both create and update: `PUT /contents/{path}`.
 * Supplying the current blob `sha` makes it an update (and is GitHub's
 * optimistic-concurrency check); omitting it makes it a create, which fails if
 * the file already exists. `file-get` returns the sha you need.
 */
const fileCreateOrUpdate: ActionDefinition<Input> = {
  key: "file-create-or-update",
  type: "perform",
  resource: "file",
  title: "Create or Update File",
  description:
    "Commit a file. Omit the SHA to create; pass the current blob SHA (from Get File) to update.",
  // The SHA is a compare-and-set token: replaying a successful update fails the
  // SHA check rather than committing twice.
  idempotent: true,
  params: [
    owner,
    repository,
    { key: "filePath", label: "Path", type: "string", required: true },
    {
      key: "content",
      label: "Content (base64)",
      type: "text",
      required: true,
      config: { multiline: true },
      hint: "GitHub requires base64. Encode the file before passing it here.",
    },
    { key: "commitMessage", label: "Commit message", type: "string", required: true },
    {
      key: "sha",
      label: "Blob SHA",
      type: "string",
      hint: "Required when updating an existing file — get it from `file-get`.",
    },
    { key: "branch", label: "Branch", type: "string", hint: "Defaults to the default branch." },
  ],
  output: [
    { key: "content", type: "object", label: "File" },
    { key: "commit", type: "object", label: "Commit" },
  ],

  execute(input, ctx) {
    return new GitHubClient(ctx).request(
      `/repos/${repoPath(input.owner, input.repository)}/contents/${contentsPath(input.filePath)}`,
      {
        method: "PUT",
        body: {
          message: input.commitMessage,
          content: input.content,
          sha: unset(input.sha),
          branch: unset(input.branch),
        },
      },
    );
  },
};

export default fileCreateOrUpdate;
