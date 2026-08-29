import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, MissiveClient } from "../lib/client.ts";

interface Input {
  id: string;
  title?: string;
  body?: string;
  subject?: string;
  shareWithTeam?: string;
  toFields?: unknown;
  ccFields?: unknown;
  bccFields?: unknown;
  attachments?: unknown;
}

/**
 * `PATCH /v1/responses/:id` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Responses, 2026-08-29.
 *
 * Only the fields set are changed, EXCEPT `attachments`: passing it replaces
 * the whole array, so any existing attachment left out is removed. Responses
 * created by an external integration (e.g. a WhatsApp template) cannot be
 * updated through this endpoint.
 */
const action: ActionDefinition<Input> = {
  key: "response-update",
  type: "perform",
  resource: "response",
  title: "Update Canned Response",
  description: "Update a canned response. Only the fields you set change — except Attachments, " +
    "which replaces the entire array when set. Responses created by an external integration " +
    "(e.g. WhatsApp templates) cannot be updated.",
  idempotent: true,
  params: [
    { key: "id", label: "Response ID", type: "string", required: true },
    { key: "title", label: "Title", type: "string", default: "" },
    { key: "body", label: "Body (HTML)", type: "text", default: "" },
    { key: "subject", label: "Subject", type: "string", default: "" },
    {
      key: "shareWithTeam",
      label: "Share With Team ID",
      type: "string",
      default: "",
      advanced: true,
    },
    { key: "toFields", label: "To (JSON array)", type: "json", default: "", advanced: true },
    { key: "ccFields", label: "Cc (JSON array)", type: "json", default: "", advanced: true },
    { key: "bccFields", label: "Bcc (JSON array)", type: "json", default: "", advanced: true },
    {
      key: "attachments",
      label: "Attachments (JSON — replaces all)",
      type: "json",
      default: "",
      advanced: true,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Response ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "modified_at", type: "number", label: "Modified At (Unix timestamp)" },
  ],

  async execute(input, ctx) {
    if (!input.id) throw new Error("`id` is required");

    const response = {
      id: input.id,
      ...compact({
        title: input.title,
        body: input.body,
        subject: input.subject,
        share_with_team: input.shareWithTeam,
      }),
      ...compact({
        to_fields: asOptionalJson(input.toFields, "toFields"),
        cc_fields: asOptionalJson(input.ccFields, "ccFields"),
        bcc_fields: asOptionalJson(input.bccFields, "bccFields"),
        attachments: asOptionalJson(input.attachments, "attachments"),
      }),
    };

    ctx.log("info", "updating Missive canned response", { id: input.id });
    const res = await new MissiveClient(ctx).json<{ responses: unknown[] }>(
      `/responses/${encodeURIComponent(input.id)}`,
      { method: "PATCH", body: { responses: [response] } },
    );
    return res.responses[0];
  },
};

export default action;
