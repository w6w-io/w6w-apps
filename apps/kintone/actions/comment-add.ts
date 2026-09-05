import type { ActionDefinition } from "@w6w/types";
import { compact, KintoneClient } from "../lib/client.ts";
import { APP_ID_PARAM, RECORD_ID_PARAM } from "../lib/params.ts";

interface Mention {
  code: string;
  type?: "USER" | "GROUP" | "ORGANIZATION";
}

interface Input {
  appId: string;
  recordId: string;
  text: string;
  mentions?: Mention[] | string;
}

interface AddCommentResponse {
  id: string;
}

/**
 * `POST /k/v1/record/comment.json` — verified against
 * `docs/kintone/rest-api/records/add-comment` 2026-09-05.
 *
 * A mentioned user's `code` needs the `guest/` prefix (e.g.
 * `guest/name@example.com`) when the recipient is a guest user.
 */
const action: ActionDefinition<Input, AddCommentResponse> = {
  key: "comment-add",
  type: "perform",
  resource: "comment",
  title: "Add Comment",
  description: "Post a comment to a record, optionally mentioning users, groups or departments.",
  idempotent: false,
  params: [
    APP_ID_PARAM,
    RECORD_ID_PARAM,
    {
      key: "text",
      label: "Comment Text",
      type: "text",
      required: true,
      validation: { maxLength: 65535 },
    },
    {
      key: "mentions",
      label: "Mentions",
      type: "json",
      advanced: true,
      hint: 'JSON array of up to 10 `{"code", "type"}` entries — `type` is `USER`, `GROUP` or ' +
        "`ORGANIZATION` (department). A guest user's `code` needs the `guest/` prefix, e.g. " +
        "`guest/name@example.com`.",
    },
  ],
  output: [{ key: "id", label: "Comment ID", type: "string" }],

  async execute(input, ctx) {
    const mentions = typeof input.mentions === "string"
      ? (input.mentions ? JSON.parse(input.mentions) : undefined)
      : input.mentions;
    if (mentions !== undefined && !Array.isArray(mentions)) {
      throw new Error("`mentions` must be a JSON array");
    }
    ctx.log("info", "adding Kintone comment", { appId: input.appId, recordId: input.recordId });
    return await new KintoneClient(ctx).request<AddCommentResponse>("/record/comment", {
      method: "POST",
      json: {
        app: input.appId,
        record: input.recordId,
        comment: compact({ text: input.text, mentions }),
      },
    });
  },
};

export default action;
