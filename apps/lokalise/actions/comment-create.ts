import type { ActionDefinition } from "@w6w/types";
import { encodeId, LokaliseClient } from "../lib/client.ts";
import { keyIdParam, projectIdParam } from "../lib/params.ts";

/**
 * `POST /projects/{project_id}/keys/{key_id}/comments` — add one or more
 * comments to a key.
 *
 * Bulk-only like the other Create endpoints, but here that matters more:
 * **there is no dedupe of any kind on a comment's text.** Unlike
 * `key-create` (blocked by `key_name` uniqueness) or `contributor-create`
 * (blocked by email uniqueness), calling this twice with the same text
 * creates the comment twice. `idempotent: false` here is not a formality —
 * a runtime retry of this action WILL duplicate the comment.
 */
interface Input {
  projectId: string;
  keyId: number;
  comments: string[];
}

const commentCreate: ActionDefinition<Input> = {
  key: "comment-create",
  type: "perform",
  resource: "comment",
  title: "Add Comments",
  description: "Add one or more comments to a key.",
  idempotent: false,
  params: [
    projectIdParam,
    keyIdParam,
    {
      key: "comments",
      label: "Comments",
      type: "array",
      required: true,
      item: { type: "string" },
      hint: "One or more comment texts to add.",
    },
  ],
  output: [
    { key: "comments", type: "array", label: "Comments created" },
  ],

  execute(input, ctx) {
    return new LokaliseClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/keys/${encodeId(input.keyId)}/comments`,
      {
        method: "POST",
        body: { comments: (input.comments ?? []).map((comment) => ({ comment })) },
      },
    );
  },
};

export default commentCreate;
