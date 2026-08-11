import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient } from "../lib/client.ts";

/**
 * `GET /api/v3.3/transactional/messages` — the transactional message timeline.
 *
 * ## Pagination here is by message ID, not by page number
 *
 * Every other paged endpoint in this API takes `page` and `pagesize`. This one
 * takes `sentBeforeID` and `sentAfterID` — cursors, each a `MessageID` — plus
 * `count` (default 50, **maximum 200**). That is a genuinely better design for a
 * timeline that grows while you read it, and it is the reason this action does
 * not reuse the shared page params: offering `page` here would be offering a
 * parameter the endpoint ignores.
 *
 * The `MessageID`s to page from are the ones `smart-email-send` and
 * `classic-email-send` return — one per recipient, not one per call.
 *
 * `group` and `smartEmailID` narrow the timeline the same way they do on
 * `transactional-statistics-get`. `status` is `delivered`, `bounced`, `spam` or
 * `all`; anything else is code 932.
 */
interface Input {
  clientId?: string;
  status?: string;
  count?: number;
  sentBeforeId?: string;
  sentAfterId?: string;
  group?: string;
  smartEmailId?: string;
}

/** The vendor's documented ceiling on `count`. */
export const MAX_MESSAGE_COUNT = 200;

const transactionalMessagesGet: ActionDefinition<Input, unknown[]> = {
  key: "transactional-messages-get",
  type: "search",
  resource: "transactional",
  title: "Get Transactional Message Timeline",
  description:
    "List sent transactional messages, newest first, filtered by status, group or smart email. " +
    "Paged by message ID cursor rather than by page number; 200 per call maximum.",
  params: [
    {
      key: "clientId",
      label: "Client",
      type: "string",
      hint:
        "REQUIRED if your connection uses an account-wide key or OAuth; leave empty if it uses a " +
        "client-specific key.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "all",
      options: [
        { value: "all", label: "All (the API default)" },
        { value: "delivered", label: "Delivered" },
        { value: "bounced", label: "Bounced" },
        { value: "spam", label: "Marked as spam" },
      ],
      hint: "Anything outside these four is code 932.",
    },
    {
      key: "count",
      label: "Count",
      type: "number",
      default: 50,
      validation: { integer: true, min: 1, max: MAX_MESSAGE_COUNT },
      hint: `The API's own default is 50 and its maximum is ${MAX_MESSAGE_COUNT}.`,
    },
    {
      key: "sentBeforeId",
      label: "Sent before message ID",
      type: "string",
      hint:
        "A MessageID cursor — returns messages sent before it. This endpoint pages by ID, not by " +
        "page number.",
    },
    {
      key: "sentAfterId",
      label: "Sent after message ID",
      type: "string",
      hint: "A MessageID cursor — returns messages sent after it.",
    },
    { key: "group", label: "Classic group", type: "string" },
    { key: "smartEmailId", label: "Smart email", type: "string" },
  ],
  output: [
    { key: "MessageID", type: "string", label: "Message ID" },
    { key: "Status", type: "string", label: "Delivered | Bounced | Spam" },
    { key: "SentAt", type: "string", label: "When it was sent" },
    { key: "Recipient", type: "string", label: "Recipient address" },
  ],

  execute(input, ctx) {
    return new CampaignMonitorClient(ctx).transactional<unknown[]>("/messages", {
      query: {
        clientID: input.clientId,
        status: input.status,
        count: input.count,
        sentBeforeID: input.sentBeforeId,
        sentAfterID: input.sentAfterId,
        group: input.group,
        smartEmailID: input.smartEmailId,
      },
    });
  },
};

export default transactionalMessagesGet;
