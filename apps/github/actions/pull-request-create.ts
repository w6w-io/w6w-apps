import type { ActionDefinition } from "@w6w/types";
import { GitHubClient, repoPath, unset } from "../lib/client.ts";
import { owner, repository } from "../lib/params.ts";

interface Input {
  owner: string;
  repository: string;
  title: string;
  head: string;
  base: string;
  body?: string;
  draft?: boolean;
  maintainerCanModify?: boolean;
}

const pullRequestCreate: ActionDefinition<Input> = {
  key: "pull-request-create",
  type: "perform",
  resource: "pullRequest",
  title: "Create Pull Request",
  description: "Open a pull request from a head branch into a base branch.",
  // GitHub assigns a new PR number per call and offers no request key, so a
  // retry opens a duplicate (or is rejected if one is already open for the
  // branch pair).
  idempotent: false,
  params: [
    owner,
    repository,
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "head",
      label: "Head branch",
      type: "string",
      required: true,
      row: "branches",
      hint: "Branch (or `user:branch` for a fork) whose changes you want to merge.",
    },
    {
      key: "base",
      label: "Base branch",
      type: "string",
      required: true,
      row: "branches",
      hint: "Branch you want the changes pulled into.",
    },
    { key: "body", label: "Body", type: "text", config: { multiline: true }, hint: "Markdown." },
    { key: "draft", label: "Draft", type: "boolean", hint: "Open as a draft pull request." },
    {
      key: "maintainerCanModify",
      label: "Maintainer can modify",
      type: "boolean",
      hint: "Allow upstream maintainers to push to the head branch.",
    },
  ],
  output: [
    { key: "number", type: "number", label: "PR number" },
    { key: "id", type: "number", label: "PR ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "state", type: "string", label: "State" },
    { key: "html_url", type: "string", label: "URL" },
  ],

  execute(input, ctx) {
    return new GitHubClient(ctx).request(
      `/repos/${repoPath(input.owner, input.repository)}/pulls`,
      {
        method: "POST",
        body: {
          title: input.title,
          head: input.head,
          base: input.base,
          body: unset(input.body),
          draft: input.draft,
          maintainer_can_modify: input.maintainerCanModify,
        },
      },
    );
  },
};

export default pullRequestCreate;
