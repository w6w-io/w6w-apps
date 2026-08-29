import type { ActionDefinition } from "@w6w/types";
import { contentsPath, GitHubClient, repoPath, unset } from "../lib/client.ts";
import { owner, repository } from "../lib/params.ts";

interface Input {
  owner: string;
  repository: string;
  filePath: string;
  ref?: string;
}

/**
 * Returns GitHub's metadata envelope, with `content` base64-encoded. Decoding
 * is left to the caller — the raw bytes may not be text.
 */
const fileGet: ActionDefinition<Input> = {
  key: "file-get",
  type: "read",
  resource: "file",
  title: "Get File",
  description: "Read a file's contents and its blob SHA. Content comes back base64-encoded.",
  params: [
    owner,
    repository,
    {
      key: "filePath",
      label: "Path",
      type: "string",
      required: true,
      hint: "Path within the repository, e.g. `src/index.ts`.",
    },
    {
      key: "ref",
      label: "Ref",
      type: "string",
      hint: "Branch, tag or commit SHA. Defaults to the default branch.",
    },
  ],
  output: [
    { key: "path", type: "string", label: "Path" },
    { key: "sha", type: "string", label: "Blob SHA (needed to update or delete)" },
    { key: "size", type: "number", label: "Size (bytes)" },
    { key: "content", type: "string", label: "Base64 content" },
    { key: "encoding", type: "string", label: "Encoding" },
  ],

  execute(input, ctx) {
    return new GitHubClient(ctx).request(
      `/repos/${repoPath(input.owner, input.repository)}/contents/${contentsPath(input.filePath)}`,
      { query: { ref: unset(input.ref) } },
    );
  },
};

export default fileGet;
