import type { ActionDefinition } from "@w6w/types";
import { compact, SendblueClient } from "../lib/client.ts";

interface Input {
  isOutbound?: "true" | "false";
  service?: string;
  status?: string;
  messageType?: "message" | "group";
  fromNumber?: string;
  toNumber?: string;
  number?: string;
  sendblueNumber?: string;
  groupId?: string;
  createdAtGte?: string;
  createdAtLte?: string;
  sentAtGte?: string;
  sentAtLte?: string;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/**
 * `GET /api/v2/messages` — rate limited to 100 requests / 10 seconds per
 * account (stated on the page itself). Two documented gotchas surfaced as
 * hints rather than left for a caller to discover the hard way:
 *
 *  - `message_type` is ONLY `message` | `group` (1:1 vs. group chat) — the
 *    docs explicitly warn it is NOT for inbound/outbound filtering, which is
 *    what `is_outbound` is for. A caller reaching for `message_type: "inbound"`
 *    gets a silently-ignored filter, not an error.
 *  - Polling for inbound messages needs `is_outbound=false` PLUS a
 *    `sendblue_number`/`to_number` filter — see the field hints below.
 */
const messageList: ActionDefinition<Input> = {
  key: "message-list",
  type: "search",
  resource: "message",
  title: "List Messages",
  description: "List messages with filtering and pagination. Rate limited to 100 req/10s.",
  params: [
    {
      key: "isOutbound",
      label: "Direction",
      type: "select",
      options: [
        { value: "true", label: "Outbound (sent)" },
        { value: "false", label: "Inbound (received)" },
      ],
      hint: "Use this to poll for inbound messages — combine with Sendblue Number below.",
    },
    {
      key: "service",
      label: "Service",
      type: "select",
      options: [{ value: "iMessage", label: "iMessage" }, { value: "SMS", label: "SMS" }, {
        value: "RCS",
        label: "RCS",
      }],
    },
    { key: "status", label: "Status", type: "string" },
    {
      key: "messageType",
      label: "Message type (1:1 vs. group — NOT inbound/outbound)",
      type: "select",
      options: [{ value: "message", label: "1:1 message" }, { value: "group", label: "Group" }],
    },
    { key: "fromNumber", label: "From number", type: "string" },
    { key: "toNumber", label: "To number", type: "string" },
    { key: "number", label: "Either party's number", type: "string" },
    {
      key: "sendblueNumber",
      label: "Sendblue number",
      type: "string",
      hint: "Your Sendblue line. Combine with Direction=Inbound to poll a specific line.",
    },
    { key: "groupId", label: "Group ID", type: "string" },
    { key: "createdAtGte", label: "Created after (ISO 8601)", type: "string", advanced: true },
    { key: "createdAtLte", label: "Created before (ISO 8601)", type: "string", advanced: true },
    { key: "sentAtGte", label: "Sent after (ISO 8601)", type: "string", advanced: true },
    { key: "sentAtLte", label: "Sent before (ISO 8601)", type: "string", advanced: true },
    {
      key: "orderBy",
      label: "Order by",
      type: "select",
      options: [{ value: "createdAt", label: "Created at" }, {
        value: "updatedAt",
        label: "Updated at",
      }, { value: "sentAt", label: "Sent at" }],
      default: "createdAt",
      advanced: true,
    },
    {
      key: "orderDirection",
      label: "Order direction",
      type: "select",
      options: [{ value: "desc", label: "Descending" }, { value: "asc", label: "Ascending" }],
      default: "desc",
      advanced: true,
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      hint: "1–1000. Sendblue's own default is unbounded on some list endpoints; this app " +
        "always prefills a small value.",
    },
    { key: "offset", label: "Offset", type: "number", default: 0, advanced: true },
  ],
  output: [
    { key: "data", type: "array", label: "Messages" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.get(
      "/api/v2/messages",
      compact({
        is_outbound: input.isOutbound,
        service: input.service,
        status: input.status,
        message_type: input.messageType,
        from_number: input.fromNumber,
        to_number: input.toNumber,
        number: input.number,
        sendblue_number: input.sendblueNumber,
        group_id: input.groupId,
        created_at_gte: input.createdAtGte,
        created_at_lte: input.createdAtLte,
        sent_at_gte: input.sentAtGte,
        sent_at_lte: input.sentAtLte,
        order_by: input.orderBy,
        order_direction: input.orderDirection,
        limit: input.limit ?? 50,
        offset: input.offset ?? 0,
      }),
    );
  },
};

export default messageList;
