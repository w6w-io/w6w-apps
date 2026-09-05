import type { ActionDefinition } from "@w6w/types";
import { BrazeClient } from "../lib/client.ts";

/**
 * `POST /messages/send` — verified against the fetched spec. Sends an
 * immediate, ad-hoc message (not tied to a saved campaign) to
 * `external_user_ids`, `user_aliases`, a `segment_id`, and/or an `audience`
 * filter. `messages` carries the per-channel payload (e.g. `{ email: {...} }`,
 * `{ apple_push: {...} }`) exactly as Braze's own docs shape it — this app
 * passes it through rather than modeling every channel's schema.
 */
const action: ActionDefinition = {
  key: "message-send",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description: "Send an immediate, ad-hoc message across one or more channels.",
  idempotent: false,
  params: [
    { key: "broadcast", label: "Broadcast (no audience/recipients)", type: "boolean" },
    {
      key: "externalUserIds",
      label: "External User IDs",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "userAliases",
      label: "User Aliases",
      type: "json",
      hint: "{ alias_name, alias_label } or an array of them.",
    },
    { key: "segmentId", label: "Segment ID", type: "string" },
    {
      key: "audience",
      label: "Audience Filter",
      type: "json",
      hint: "Braze connected-audience filter object (AND/OR of attribute/segment conditions).",
    },
    {
      key: "messages",
      label: "Messages",
      type: "json",
      required: true,
      hint: 'Per-channel payload, e.g. { "email": {...} } or { "apple_push": {...} }.',
    },
    {
      key: "sendId",
      label: "Send ID",
      type: "string",
      hint: "Defaults to the invocation ID so Braze's analytics can correlate this send.",
    },
  ],
  output: [
    { key: "dispatchId", type: "string", label: "Dispatch ID" },
  ],

  async execute(input, ctx) {
    const p = input as {
      broadcast?: boolean;
      externalUserIds?: string[];
      userAliases?: unknown;
      segmentId?: string;
      audience?: unknown;
      messages: unknown;
      sendId?: string;
    };
    ctx.log("info", "sending Braze message");
    return await new BrazeClient(ctx).post("/messages/send", {
      broadcast: p.broadcast ?? undefined,
      external_user_ids: p.externalUserIds?.length ? p.externalUserIds : undefined,
      user_aliases: p.userAliases ?? undefined,
      segment_id: p.segmentId || undefined,
      audience: p.audience ?? undefined,
      messages: p.messages,
      send_id: p.sendId || ctx.invocation?.invocationId || undefined,
    });
  },
};

export default action;
