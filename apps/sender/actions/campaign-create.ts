import type { ActionDefinition } from "@w6w/types";
import { compact, SenderClient } from "../lib/client.ts";

/**
 * `POST /v2/campaigns` — creates a new campaign from scratch.
 *
 * Plain text or HTML content can be provided via the API; a drag-and-drop
 * template must be authored in the Sender web app, per the vendor's own docs.
 */
interface Input {
  title?: string;
  subject: string;
  from: string;
  preheader?: string;
  replyTo: string;
  contentType: string;
  googleAnalytics?: boolean;
  autoFollowupSubject?: string;
  autoFollowupDelay?: number;
  autoFollowupActive?: boolean;
  groups?: string[];
  segments?: string[];
  content?: string;
}

const campaignCreate: ActionDefinition<Input> = {
  key: "campaign-create",
  type: "perform",
  resource: "campaign",
  title: "Create Campaign",
  description: "Create a new campaign. Only plain text and HTML content are settable via the " +
    "API; drag-and-drop templates require the Sender web app.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", hint: "Internal name, shown in reports." },
    { key: "subject", label: "Subject", type: "string", required: true },
    { key: "from", label: "From name", type: "string", required: true },
    { key: "preheader", label: "Preview text", type: "string" },
    {
      key: "replyTo",
      label: "Reply-to email",
      type: "string",
      required: true,
      hint: "Must belong to a verified domain in your account.",
    },
    {
      key: "contentType",
      label: "Content type",
      type: "select",
      required: true,
      options: [
        { value: "editor", label: "Editor (drag & drop, set up in the Sender app)" },
        { value: "html", label: "HTML" },
        { value: "text", label: "Plain text" },
      ],
    },
    {
      key: "googleAnalytics",
      label: "Google Analytics tracking",
      type: "boolean",
      hint: "Enable or disable Google Analytics tracking for the links in this campaign.",
    },
    { key: "autoFollowupSubject", label: "Follow-up subject", type: "string" },
    {
      key: "autoFollowupDelay",
      label: "Follow-up delay (hours)",
      type: "number",
      validation: { enum: [12, 24, 48, 72, 96, 120, 144, 168] },
      hint: "Must be one of 12, 24, 48, 72, 96, 120, 144, or 168 hours.",
    },
    {
      key: "autoFollowupActive",
      label: "Follow-up active",
      type: "boolean",
      hint: "Sends the follow-up to subscribers who did not open the original campaign.",
    },
    { key: "groups", label: "Group IDs", type: "multiselect" },
    { key: "segments", label: "Segment IDs", type: "multiselect" },
    {
      key: "content",
      label: "Content",
      type: "text",
      hint: "Plain text or HTML content, matching Content type.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Campaign ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data("/campaigns", {
      method: "POST",
      body: compact({
        title: input.title,
        subject: input.subject,
        from: input.from,
        preheader: input.preheader,
        reply_to: input.replyTo,
        content_type: input.contentType,
        google_analytics: input.googleAnalytics === undefined
          ? undefined
          : (input.googleAnalytics ? 1 : 0),
        auto_followup_subject: input.autoFollowupSubject,
        auto_followup_delay: input.autoFollowupDelay,
        auto_followup_active: input.autoFollowupActive,
        groups: input.groups,
        segments: input.segments,
        content: input.content,
      }),
    });
  },
};

export default campaignCreate;
