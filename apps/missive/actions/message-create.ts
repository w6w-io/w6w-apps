import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, MissiveClient } from "../lib/client.ts";
import { ATTACHMENTS_PARAM, CONVERSATION_ROUTING_PARAMS, routingFields } from "../lib/params.ts";

interface Input {
  account: string;
  subject?: string;
  body?: string;
  fromField?: unknown;
  toFields?: unknown;
  ccFields?: unknown;
  bccFields?: unknown;
  attachments?: unknown;
  deliveredAt?: number;
  externalId?: string;
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
 * `POST /v1/messages` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Messages, 2026-08-29.
 *
 * **Custom channels only** — this simulates a message *received* from an
 * external system integrated as a Missive custom channel. To send an email or
 * reply from Missive itself, use Create Draft with Send enabled instead;
 * Missive's own docs make this the load-bearing warning on this endpoint.
 *
 * `fromField`/`toFields` are `{"id","username","name"}` for custom-channel
 * participants (or `{"address","name"}` for the email channel) — accepted as
 * JSON since the shape is channel-specific.
 *
 * The reference shows a request payload for this endpoint but no matching
 * response example, so the output below is left as a single opaque object
 * rather than a guessed field list.
 */
const action: ActionDefinition<Input> = {
  key: "message-create",
  type: "perform",
  resource: "message",
  title: "Create Incoming Message (Custom Channel)",
  description:
    "Simulate a message received on a custom channel. Not for sending email or replies — use " +
    "Create Draft with Send enabled for that.",
  idempotent: false,
  params: [
    {
      key: "account",
      label: "Account ID",
      type: "string",
      required: true,
      hint: "Find it in the custom channel's settings.",
    },
    { key: "subject", label: "Subject", type: "string", default: "", hint: "Email channel only." },
    { key: "body", label: "Body", type: "text", default: "", hint: "HTML or text, per channel." },
    {
      key: "fromField",
      label: "From (JSON)",
      type: "json",
      default: "",
      hint: 'Email: {"address":"…","name":"…"}. Text/HTML channel: {"id":"…","username":"…",' +
        '"name":"…"}.',
    },
    { key: "toFields", label: "To (JSON array)", type: "json", default: "" },
    { key: "ccFields", label: "Cc (JSON array)", type: "json", default: "", advanced: true },
    { key: "bccFields", label: "Bcc (JSON array)", type: "json", default: "", advanced: true },
    ATTACHMENTS_PARAM,
    {
      key: "deliveredAt",
      label: "Delivered At (Unix timestamp)",
      type: "number",
      default: 0,
      advanced: true,
      hint: "Defaults to request time.",
    },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "Unique id for non-email messages (SMS, Instagram DMs, etc). Also usable as a " +
        "reference for appending later messages to the same conversation.",
    },
    ...CONVERSATION_ROUTING_PARAMS,
  ],
  output: [
    { key: "messages", type: "object", label: "Response body — shape undocumented by Missive" },
  ],

  async execute(input, ctx) {
    if (!input.account) throw new Error("`account` is required");

    const message = {
      account: input.account,
      ...compact({
        subject: input.subject,
        body: input.body,
        delivered_at: input.deliveredAt,
        external_id: input.externalId,
      }),
      ...compact({
        from_field: asOptionalJson(input.fromField, "fromField"),
        to_fields: asOptionalJson(input.toFields, "toFields"),
        cc_fields: asOptionalJson(input.ccFields, "ccFields"),
        bcc_fields: asOptionalJson(input.bccFields, "bccFields"),
        attachments: asOptionalJson(input.attachments, "attachments"),
      }),
      ...routingFields(input as unknown as Record<string, unknown>),
    };

    ctx.log("info", "creating Missive custom-channel message", { account: input.account });
    return await new MissiveClient(ctx).json("/messages", {
      method: "POST",
      body: { messages: message },
    });
  },
};

export default action;
