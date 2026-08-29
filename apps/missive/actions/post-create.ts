import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, MissiveClient } from "../lib/client.ts";
import { CONVERSATION_ROUTING_PARAMS, routingFields } from "../lib/params.ts";

interface Input {
  notificationTitle: string;
  notificationBody: string;
  text?: string;
  markdown?: string;
  username?: string;
  usernameIcon?: string;
  conversationIcon?: string;
  attachments?: unknown;
  reopen?: boolean;
  conversation?: string;
  references?: string;
  conversationSubject?: string;
  conversationColor?: string;
  organization?: string;
  team?: string;
  forceTeam?: boolean;
  addUsers?: string;
  addAssignees?: string;
  removeAssignees?: string;
  addSharedLabels?: string;
  removeSharedLabels?: string;
  addToInbox?: boolean;
  addToTeamInbox?: boolean;
  close?: boolean;
}

/**
 * `POST /v1/posts` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Posts, 2026-08-29.
 *
 * Posts are Missive's recommended way to manage conversation state (close,
 * move to inbox, assign, label) from an integration, because — unlike Update
 * Conversation — a post leaves a visible entry showing what triggered the
 * change. `notification` is documented as required (the `*` in the vendor's
 * own attributes table); separately, at least one of Text, Markdown, or
 * Attachments is required.
 *
 * There is currently no parameter to *archive* a conversation via this API
 * (Missive's own docs state this plainly) — only Move To Inbox (unarchive),
 * Close, and Reopen exist.
 *
 * `attachments` here supports two shapes: formatted "attachment blocks"
 * (`color`, `title`, `text`, `fields`, …, rendered like a rich card) and
 * binary file attachments (`base64_data`+`filename`, same shape as drafts).
 * Accepted as JSON since the two shapes differ.
 */
const action: ActionDefinition<Input> = {
  key: "post-create",
  type: "perform",
  resource: "post",
  title: "Create Post",
  description:
    "Insert a post into a conversation — the recommended way for an integration to leave a " +
    "visible trace while closing, moving, assigning, or labeling a conversation. Requires a " +
    "notification, and at least one of Text, Markdown, or Attachments.",
  idempotent: false,
  params: [
    {
      key: "notificationTitle",
      label: "Notification Title",
      type: "string",
      required: true,
    },
    {
      key: "notificationBody",
      label: "Notification Body",
      type: "string",
      required: true,
    },
    {
      key: "text",
      label: "Text",
      type: "text",
      default: "",
      hint: "Plain-text body of the post. Max 8000 characters. One of Text, Markdown, or " +
        "Attachments is required.",
    },
    {
      key: "markdown",
      label: "Markdown",
      type: "text",
      default: "",
      advanced: true,
      hint: "Markdown-formatted body. Max 8000 characters.",
    },
    { key: "username", label: "Post Author Name", type: "string", default: "" },
    {
      key: "usernameIcon",
      label: "Post Author Icon URL",
      type: "string",
      default: "",
      advanced: true,
    },
    {
      key: "conversationIcon",
      label: "Conversation List Icon URL",
      type: "string",
      default: "",
      advanced: true,
    },
    {
      key: "attachments",
      label: "Attachments (JSON array)",
      type: "json",
      default: "",
      advanced: true,
      hint: 'Rich blocks (e.g. {"title":"…","text":"…","color":"good","fields":[…]}) or files ' +
        '({"base64_data","filename"}). JPEG/PNG/GIF/MOV/MP4/MP3 render inline; others download.',
    },
    {
      key: "reopen",
      label: "Keep Closed On New Post",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Prevents a closed conversation from reopening because of this post.",
    },
    ...CONVERSATION_ROUTING_PARAMS,
  ],
  output: [
    { key: "conversation", type: "string", label: "Conversation ID" },
    { key: "id", type: "string", label: "Post ID — use to delete the post" },
  ],

  async execute(input, ctx) {
    if (!input.notificationTitle || !input.notificationBody) {
      throw new Error("`notificationTitle` and `notificationBody` are required");
    }
    if (!input.text && !input.markdown && !input.attachments) {
      throw new Error("one of `text`, `markdown`, or `attachments` is required");
    }

    const post = {
      notification: { title: input.notificationTitle, body: input.notificationBody },
      ...compact({
        text: input.text,
        markdown: input.markdown,
        username: input.username,
        username_icon: input.usernameIcon,
        conversation_icon: input.conversationIcon,
        reopen: input.reopen === true ? true : undefined,
        attachments: asOptionalJson(input.attachments, "attachments"),
      }),
      ...routingFields(input as unknown as Record<string, unknown>),
    };

    ctx.log("info", "creating Missive post", { conversation: input.conversation });
    const res = await new MissiveClient(ctx).json<{ posts: { conversation: string; id: string } }>(
      "/posts",
      { method: "POST", body: { posts: post } },
    );
    return res.posts;
  },
};

export default action;
