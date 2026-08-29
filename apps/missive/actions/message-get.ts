import type { ActionDefinition } from "@w6w/types";
import { joinIds, MissiveClient } from "../lib/client.ts";

interface Input {
  ids: string;
}

/**
 * `GET /v1/messages/:id` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Messages, 2026-08-29.
 *
 * Accepts one id or several comma-separated ids in the same call (Missive's
 * own documented way to reduce request volume against the rate limit).
 * Documented response shape: a **single** id answers `{"messages": {...}}` (a
 * bare object); **several** comma-separated ids answer
 * `{"messages": [...]}` (an array). This action returns whichever shape
 * Missive sent rather than forcing one.
 *
 * `body` (full HTML) and inline-image `attachments` are only present here,
 * not in any of the list endpoints.
 */
const action: ActionDefinition<Input> = {
  key: "message-get",
  type: "read",
  resource: "message",
  title: "Get Message(s)",
  description: "Fetch one or more messages by ID, including headers, body, and attachments. Pass " +
    "comma-separated IDs to fetch several in one call.",
  params: [
    {
      key: "ids",
      label: "Message ID(s)",
      type: "string",
      required: true,
      hint: "Comma-separated for multiple.",
    },
  ],
  output: [
    {
      key: "messages",
      type: "object",
      label: "A single message object, or an array when multiple IDs were requested",
    },
  ],

  async execute(input, ctx) {
    const path = `/messages/${joinIds(input.ids)}`;
    return await new MissiveClient(ctx).json(path);
  },
};

export default action;
