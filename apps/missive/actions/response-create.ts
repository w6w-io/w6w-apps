import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, MissiveClient } from "../lib/client.ts";

interface Input {
  title?: string;
  organization?: string;
  user?: string;
  body?: string;
  subject?: string;
  shareWithTeam?: string;
  sharedLabels?: string;
  toFields?: unknown;
  ccFields?: unknown;
  bccFields?: unknown;
  externalId?: string;
  externalSource?: string;
  attachments?: unknown;
}

/**
 * `POST /v1/responses` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Responses, 2026-08-29.
 *
 * Exactly one of `organization` (a shared, team-visible response) or `user`
 * (a personal one) is required — Missive rejects both together and neither.
 * `externalId`+`externalSource` let a synced response (e.g. from a knowledge
 * base) be looked up and updated later without Missive's own id; the pair
 * must be unique per organization or user.
 *
 * Inline images: give an attachment a temporary `id` and reference it in
 * `body` via `data-missive-attachment-id="that-id"`; Missive swaps in the
 * real attachment UUID.
 */
const action: ActionDefinition<Input> = {
  key: "response-create",
  type: "perform",
  resource: "response",
  title: "Create Canned Response",
  description: "Create a canned/template response, shared with an organization or scoped to a " +
    "single user.",
  idempotent: false,
  params: [
    {
      key: "title",
      label: "Title",
      type: "string",
      default: "",
      hint: "Max 500 characters.",
    },
    {
      key: "organization",
      label: "Organization ID",
      type: "string",
      default: "",
      hint: "Either Organization ID or User ID is required, not both.",
    },
    {
      key: "user",
      label: "User ID (personal response)",
      type: "string",
      default: "",
      hint: "Either Organization ID or User ID is required, not both.",
    },
    { key: "body", label: "Body (HTML)", type: "text", default: "" },
    { key: "subject", label: "Subject", type: "string", default: "", hint: "Max 500 characters." },
    {
      key: "shareWithTeam",
      label: "Share With Team ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "Requires Organization ID.",
    },
    {
      key: "sharedLabels",
      label: "Shared Labels (comma-separated IDs)",
      type: "string",
      default: "",
      advanced: true,
      hint: "Requires Organization ID.",
    },
    { key: "toFields", label: "To (JSON array)", type: "json", default: "", advanced: true },
    { key: "ccFields", label: "Cc (JSON array)", type: "json", default: "", advanced: true },
    { key: "bccFields", label: "Bcc (JSON array)", type: "json", default: "", advanced: true },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "For syncing with another system. Requires External Source; the pair must be " +
        "unique per organization or user.",
    },
    {
      key: "externalSource",
      label: "External Source",
      type: "string",
      default: "",
      advanced: true,
    },
    {
      key: "attachments",
      label: "Attachments (JSON)",
      type: "json",
      default: "",
      advanced: true,
      hint: 'Array of {"base64_data","filename","id"?}. Give an item an "id" and reference it ' +
        'in Body via data-missive-attachment-id="that-id" to embed it inline.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Response ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "modified_at", type: "number", label: "Modified At (Unix timestamp)" },
  ],

  async execute(input, ctx) {
    if (!input.organization && !input.user) {
      throw new Error("either `organization` or `user` is required");
    }
    if (input.organization && input.user) {
      throw new Error("`organization` and `user` are mutually exclusive");
    }
    if (
      (input.externalId && !input.externalSource) || (!input.externalId && input.externalSource)
    ) {
      throw new Error("`externalId` and `externalSource` must be provided together");
    }

    const response = {
      ...compact({
        title: input.title,
        organization: input.organization,
        user: input.user,
        body: input.body,
        subject: input.subject,
        share_with_team: input.shareWithTeam,
        external_id: input.externalId,
        external_source: input.externalSource,
      }),
      ...(input.sharedLabels
        ? { shared_labels: input.sharedLabels.split(",").map((s) => s.trim()).filter(Boolean) }
        : {}),
      ...compact({
        to_fields: asOptionalJson(input.toFields, "toFields"),
        cc_fields: asOptionalJson(input.ccFields, "ccFields"),
        bcc_fields: asOptionalJson(input.bccFields, "bccFields"),
        attachments: asOptionalJson(input.attachments, "attachments"),
      }),
    };

    ctx.log("info", "creating Missive canned response", { title: input.title });
    const res = await new MissiveClient(ctx).json<{ responses: unknown[] }>("/responses", {
      method: "POST",
      body: { responses: [response] },
    });
    return res.responses[0];
  },
};

export default action;
