import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, encodeSegment, flag, PodioClient } from "../lib/client.ts";
import { refIdParam, refTypeParam, writeSwitchParams } from "../lib/params.ts";

/**
 * `POST /comment/{type}/{id}/` — "Adds a new comment to the object of the given
 * type and id."
 *
 * The cheapest way for a workflow to write back into Podio where a human will
 * see it: a comment on an item shows up in the item's stream and notifies its
 * subscribers, without touching any field.
 *
 * ## `alert_invite` grants workspace access, so it is off by default
 *
 * Podio: "True if any mentioned user should be automatically invited to the
 * workspace if the user does not have access to the object and access cannot be
 * granted to the object." A comment body containing an @-mention plus this flag
 * is a membership grant issued by an automation. Podio's default is `false` and
 * this app leaves it there; the parameter is exposed, advanced, with that said
 * on it.
 *
 * ## Not idempotent
 *
 * Podio accepts an `external_id` on a comment but does not deduplicate by it,
 * so a retry posts a second comment. Anything that runs on a schedule and
 * comments should read List Comments first and check for its own `external_id`.
 */
interface Input {
  refType: string;
  refId: string;
  value: string;
  externalId?: string;
  embedUrl?: string;
  fileIds?: unknown;
  alertInvite?: boolean;
  hook?: boolean;
  silent?: boolean;
}

const COMMENTABLE = ["item", "task", "status", "app", "space", "file"];

const commentAdd: ActionDefinition<Input> = {
  key: "comment-add",
  type: "perform",
  resource: "comment",
  title: "Add Comment",
  description: "Post a comment on an item, task or other Podio object. Notifies the object's " +
    "subscribers without changing any field value.",
  idempotent: false,
  params: [
    refTypeParam(COMMENTABLE, "What to comment on. `item` is the common case."),
    refIdParam(),
    {
      key: "value",
      label: "Comment",
      type: "text",
      required: true,
      hint: "The comment body. @-mentions work here; see the invite switch below before " +
        "using them from an automation.",
    },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      advanced: true,
      hint: "Your own id for this comment. Podio stores it but does not deduplicate on it — " +
        "check List Comments yourself before re-posting.",
    },
    {
      key: "embedUrl",
      label: "Embed URL",
      type: "string",
      advanced: true,
      hint: "A URL for Podio to attach as an embed.",
    },
    {
      key: "fileIds",
      label: "File IDs",
      type: "json",
      advanced: true,
      placeholder: "[123456]",
      hint: "Ids of files already uploaded to Podio, to attach to the comment.",
    },
    {
      key: "alertInvite",
      label: "Invite mentioned users to the workspace",
      type: "boolean",
      advanced: true,
      hint: "OFF by default, matching Podio. Turning it on lets an @-mention in this comment " +
        "grant someone workspace access — a membership change made by an automation.",
    },
    ...writeSwitchParams(),
  ],
  output: [
    { key: "commentId", type: "number", label: "New comment id" },
    { key: "grantedUsers", type: "array", label: "Users granted access by this comment" },
  ],

  async execute(input, ctx) {
    const body: Record<string, unknown> = { value: input.value };
    if (input.externalId) body.external_id = input.externalId;
    if (input.embedUrl) body.embed_url = input.embedUrl;
    const fileIds = asOptionalJson<unknown[]>(input.fileIds, "File IDs");
    if (fileIds !== undefined) body.file_ids = fileIds;

    const created = await new PodioClient(ctx).json<
      { comment_id?: number; granted_users?: unknown[] }
    >(
      `/comment/${encodeSegment(input.refType)}/${encodeSegment(input.refId)}/`,
      {
        method: "POST",
        body,
        query: {
          alert_invite: flag(input.alertInvite),
          hook: flag(input.hook),
          silent: flag(input.silent),
        },
      },
    );
    return { commentId: created?.comment_id, grantedUsers: created?.granted_users ?? [] };
  },
};

export default commentAdd;
