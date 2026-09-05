import type { ActionDefinition } from "@w6w/types";
import { compact, jsonArray, resourceUrl, SignRequestClient } from "../lib/client.ts";
import { documentSummaryOutput } from "../lib/params.ts";

interface Input {
  name?: string;
  externalId?: string;
  fileFromUrl?: string;
  fileFromContent?: string;
  fileFromContentName?: string;
  templateId?: string;
  eventsCallbackUrl?: string;
  prefillTags?: string;
  autoDeleteDays?: number;
  autoExpireDays?: number;
}

/**
 * `POST /documents/` — create a document, the first of two calls needed to send a SignRequest (the
 * second is `signrequest-create`). Use `signrequest-quick-create` instead to do both in one call.
 *
 * SignRequest documents three, mutually exclusive ways to supply content: `templateId` (copies an
 * existing template created in the SignRequest UI), `fileFromUrl` (a publicly reachable URL
 * SignRequest downloads from — also accepts a Google Drive shareable link), or `fileFromContent`
 * plus `fileFromContentName` (base64-encoded content and its filename, so SignRequest can infer the
 * content type). Exactly one should be given; this action does not choose for you.
 */
const documentCreate: ActionDefinition<Input> = {
  key: "document-create",
  type: "perform",
  resource: "document",
  title: "Create Document",
  description:
    "Create a document from a template, a publicly reachable URL, or base64-encoded content. " +
    "Exactly one of Template ID / File from URL / File from Content should be given.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", hint: "Defaults to the filename, if known." },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      hint: "Reference to this document in your own system.",
    },
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      hint: "Copy an existing template's uuid (from List Templates).",
    },
    {
      key: "fileFromUrl",
      label: "File from URL",
      type: "string",
      hint: "A publicly reachable URL SignRequest will download. Also accepts a Google Drive " +
        "shareable link.",
    },
    { key: "fileFromContent", label: "File from Content (base64)", type: "text" },
    {
      key: "fileFromContentName",
      label: "File from Content — filename",
      type: "string",
      hint: "Including extension. Required when File from Content is used.",
    },
    {
      key: "eventsCallbackUrl",
      label: "Events Callback URL",
      type: "string",
      hint: "Overrides the team-wide callback URL for events on this document only.",
    },
    {
      key: "prefillTags",
      label: "Prefill Tags (JSON array)",
      type: "text",
      hint: 'e.g. `[{"external_id":"customer_city","text":"New York"}]` — prefill a template\'s ' +
        "tagged fields.",
    },
    {
      key: "autoDeleteDays",
      label: "Auto-delete after (days)",
      type: "number",
      hint: "Days after the document is finished (signed/cancelled/declined) before it is deleted.",
    },
    {
      key: "autoExpireDays",
      label: "Auto-expire after (days)",
      type: "number",
      hint: "Days before a non-finished document automatically expires.",
    },
  ],
  output: documentSummaryOutput,

  execute(input, ctx) {
    return new SignRequestClient(ctx).request("/documents/", {
      method: "POST",
      body: compact({
        name: input.name,
        external_id: input.externalId,
        template: input.templateId ? resourceUrl("templates", input.templateId) : undefined,
        file_from_url: input.fileFromUrl,
        file_from_content: input.fileFromContent,
        file_from_content_name: input.fileFromContentName,
        events_callback_url: input.eventsCallbackUrl,
        prefill_tags: input.prefillTags ? jsonArray(input.prefillTags, "prefillTags") : undefined,
        auto_delete_days: input.autoDeleteDays,
        auto_expire_days: input.autoExpireDays,
      }),
    });
  },
};

export default documentCreate;
