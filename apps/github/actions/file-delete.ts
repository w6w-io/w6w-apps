import type { ActionDefinition } from "@w6w/types";
import { contentsPath, GitHubClient, repoPath, unset } from "../lib/client.ts";
import { owner, repository } from "../lib/params.ts";

interface Input {
  owner: string;
  repository: string;
  filePath: string;
  commitMessage: string;
  sha: string;
  branch?: string;
}

const fileDelete: ActionDefinition<Input> = {
  key: "file-delete",
  type: "perform",
  resource: "file",
  title: "Delete File",
  description: "Commit the deletion of a file. Requires the file's current blob SHA.",
  idempotent: true,
  params: [
    owner,
    repository,
    { key: "filePath", label: "Path", type: "string", required: true },
    { key: "commitMessage", label: "Commit message", type: "string", required: true },
    {
      key: "sha",
      label: "Blob SHA",
      type: "string",
      required: true,
      hint: "The file's current blob SHA — get it from `file-get`.",
    },
    { key: "branch", label: "Branch", type: "string" },
  ],
  output: [{ key: "commit", type: "object", label: "Commit" }],

  execute(input, ctx) {
    return new GitHubClient(ctx).request(
      `/repos/${repoPath(input.owner, input.repository)}/contents/${contentsPath(input.filePath)}`,
      {
        method: "DELETE",
        body: { message: input.commitMessage, sha: input.sha, branch: unset(input.branch) },
      },
    );
  },
};

export default fileDelete;
