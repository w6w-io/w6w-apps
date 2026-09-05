import type { ActionDefinition } from "@w6w/types";
import { JiraDcClient, unset } from "../lib/client.ts";
import { issueKey } from "../lib/params.ts";

interface Input {
  issueKey: string;
  body: string;
  visibilityRole?: string;
}

const commentAdd: ActionDefinition<Input> = {
  key: "comment-add",
  type: "perform",
  resource: "comment",
  title: "Add Comment",
  description: "Post a comment on an issue, optionally restricted to one role.",
  idempotent: false,
  params: [
    issueKey,
    {
      key: "body",
      label: "Comment",
      type: "text",
      required: true,
      config: { multiline: true },
      hint: "Plain text or Jira wiki markup — Data Center's v2 API takes a plain string, not the " +
        "ADF object Jira Cloud requires.",
    },
    {
      key: "visibilityRole",
      label: "Restrict to role",
      type: "string",
      placeholder: "Administrators",
      hint: "Only members of this project role will see the comment.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "created", type: "string", label: "Created" },
    { key: "author", type: "object", label: "Author" },
  ],

  execute(input, ctx) {
    return new JiraDcClient(ctx).request(`/issue/${encodeURIComponent(input.issueKey)}/comment`, {
      method: "POST",
      body: {
        body: input.body,
        visibility: unset(input.visibilityRole)
          ? { type: "role", value: input.visibilityRole }
          : undefined,
      },
    });
  },
};

export default commentAdd;
