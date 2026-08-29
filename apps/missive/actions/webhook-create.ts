import type { ActionDefinition } from "@w6w/types";
import { compact, MissiveClient } from "../lib/client.ts";

type HookType =
  | "incoming_email"
  | "incoming_sms_message"
  | "incoming_facebook_message"
  | "incoming_whatsapp_message"
  | "incoming_twilio_chat_message"
  | "new_comment";

interface Input {
  type: HookType;
  url: string;
  organization?: string;
  contentContains?: string;
  contentStartsWith?: string;
  contentEndsWith?: string;
  isTask?: boolean;
  author?: string;
  mention?: string;
  fromEq?: string;
  subjectContains?: string;
}

/**
 * `POST /v1/hooks` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Hooks, 2026-08-29.
 *
 * Under the hood this creates a Missive rule with a webhook action — visible
 * and editable later in Missive's own Rules settings, like any other rule.
 * `isTask`/`author`/`mention` only apply when Type is New Comment;
 * `fromEq`/`subjectContains` only apply when Type is Incoming Email.
 */
const action: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook Subscription",
  description:
    "Subscribe a URL to a Missive event. Creates a Missive rule with a webhook action under " +
    "the hood, editable later in Rules settings.",
  idempotent: false,
  params: [
    {
      key: "type",
      label: "Event Type",
      type: "select",
      required: true,
      options: [
        { value: "incoming_email", label: "Incoming Email" },
        { value: "incoming_sms_message", label: "Incoming SMS Message" },
        { value: "incoming_facebook_message", label: "Incoming Facebook Message" },
        { value: "incoming_whatsapp_message", label: "Incoming WhatsApp Message" },
        { value: "incoming_twilio_chat_message", label: "Incoming Twilio Chat Message" },
        { value: "new_comment", label: "New Comment" },
      ],
    },
    { key: "url", label: "Webhook URL", type: "string", required: true },
    {
      key: "organization",
      label: "Organization ID",
      type: "string",
      default: "",
      hint: "Omit for a personal webhook subscription.",
    },
    {
      key: "contentContains",
      label: "Content Contains",
      type: "string",
      default: "",
      advanced: true,
    },
    {
      key: "contentStartsWith",
      label: "Content Starts With",
      type: "string",
      default: "",
      advanced: true,
    },
    {
      key: "contentEndsWith",
      label: "Content Ends With",
      type: "string",
      default: "",
      advanced: true,
    },
    {
      key: "isTask",
      label: "Task Comments Only",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "New Comment only.",
      showIf: { "==": [{ var: "type" }, "new_comment"] },
    },
    {
      key: "author",
      label: "Author User ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "New Comment only.",
      showIf: { "==": [{ var: "type" }, "new_comment"] },
    },
    {
      key: "mention",
      label: "Mentioned User ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "New Comment only.",
      showIf: { "==": [{ var: "type" }, "new_comment"] },
    },
    {
      key: "fromEq",
      label: "From Address Equals",
      type: "string",
      default: "",
      advanced: true,
      hint: "Incoming Email only.",
      showIf: { "==": [{ var: "type" }, "incoming_email"] },
    },
    {
      key: "subjectContains",
      label: "Subject Contains",
      type: "string",
      default: "",
      advanced: true,
      hint: "Incoming Email only.",
      showIf: { "==": [{ var: "type" }, "incoming_email"] },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook (rule) ID — use to delete" },
  ],

  async execute(input, ctx) {
    if (!input.type) throw new Error("`type` is required");
    if (!input.url) throw new Error("`url` is required");

    const hook = compact({
      type: input.type,
      url: input.url,
      organization: input.organization,
      content_contains: input.contentContains,
      content_starts_with: input.contentStartsWith,
      content_ends_with: input.contentEndsWith,
      is_task: input.type === "new_comment" && input.isTask === true ? true : undefined,
      author: input.type === "new_comment" ? input.author : undefined,
      mention: input.type === "new_comment" ? input.mention : undefined,
      from_eq: input.type === "incoming_email" ? input.fromEq : undefined,
      subject_contains: input.type === "incoming_email" ? input.subjectContains : undefined,
    });

    ctx.log("info", "creating Missive webhook", { type: input.type, url: input.url });
    const res = await new MissiveClient(ctx).json<{ hooks: { id: string } }>("/hooks", {
      method: "POST",
      body: { hooks: hook },
    });
    return res.hooks;
  },
};

export default action;
