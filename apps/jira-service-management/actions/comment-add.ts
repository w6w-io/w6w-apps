import type { ActionDefinition } from "@w6w/types";
import { JsmClient } from "../lib/client.ts";
import { issueIdOrKey } from "../lib/params.ts";

interface Input {
  issueIdOrKey: string;
  body: string;
  public?: boolean;
}

/**
 * `body` is a plain string here — JSM's `CommentCreateDTO` takes
 * `{ body, public }` verbatim, unlike Jira Software's v3 comment endpoint
 * (which the sibling `jira` app wraps in Atlassian Document Format).
 */
const commentAdd: ActionDefinition<Input> = {
  key: "comment-add",
  type: "perform",
  resource: "comment",
  title: "Add Comment",
  description: "Post a comment on a request, public or internal.",
  idempotent: false,
  params: [
    issueIdOrKey,
    { key: "body", label: "Comment", type: "text", required: true, config: { multiline: true } },
    {
      key: "public",
      label: "Public",
      type: "boolean",
      default: true,
      hint: "Off posts an internal comment, visible only to agents.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "created", type: "object", label: "Created" },
    { key: "author", type: "object", label: "Author" },
  ],

  execute(input, ctx) {
    return new JsmClient(ctx).request(
      `/request/${encodeURIComponent(input.issueIdOrKey)}/comment`,
      { method: "POST", body: { body: input.body, public: input.public ?? true } },
    );
  },
};

export default commentAdd;
