import type { ActionDefinition } from "@w6w/types";
import { MessageBirdClient } from "../lib/client.ts";

interface Input {
  originator?: string;
  recipient?: string;
  direction?: "mt" | "mo";
  type?: "sms" | "binary" | "flash";
  status?: "scheduled" | "sent" | "buffered" | "delivered" | "expired" | "delivery_failed";
  searchterm?: string;
  limit?: number;
  offset?: number;
}

/**
 * List SMS messages: `GET /messages`, filtered by the query parameters
 * MessageBird documents under "Filters". Verified against
 * developers.messagebird.com/api/sms-messaging/#list-messsages.
 */
const messageList: ActionDefinition<Input> = {
  key: "message-list",
  type: "search",
  resource: "sms",
  title: "List Messages",
  description: "List sent and received SMS messages, optionally filtered.",
  params: [
    { key: "originator", label: "Originator", type: "string" },
    { key: "recipient", label: "Recipient", type: "string" },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [
        { value: "mt", label: "Sent (mobile terminated)" },
        { value: "mo", label: "Received (mobile originated)" },
      ],
    },
    {
      key: "type",
      label: "Message type",
      type: "select",
      options: [
        { value: "sms", label: "SMS" },
        { value: "binary", label: "Binary" },
        { value: "flash", label: "Flash" },
      ],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "scheduled", label: "Scheduled" },
        { value: "sent", label: "Sent" },
        { value: "buffered", label: "Buffered" },
        { value: "delivered", label: "Delivered" },
        { value: "expired", label: "Expired" },
        { value: "delivery_failed", label: "Delivery failed" },
      ],
    },
    {
      key: "searchterm",
      label: "Search term",
      type: "string",
      hint: "Matches against recipient and originator.",
    },
    { key: "limit", label: "Limit", type: "number", default: 20 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "offset", type: "number", label: "Offset" },
    { key: "limit", type: "number", label: "Limit" },
    { key: "count", type: "number", label: "Count in this page" },
    { key: "totalCount", type: "number", label: "Total matching messages" },
    { key: "items", type: "array", label: "Messages" },
  ],

  execute(input, ctx) {
    const client = new MessageBirdClient(ctx);
    return client.request(`/messages`, {
      query: {
        originator: input.originator,
        recipient: input.recipient,
        direction: input.direction,
        type: input.type,
        status: input.status,
        searchterm: input.searchterm,
        limit: input.limit,
        offset: input.offset,
      },
    });
  },
};

export default messageList;
