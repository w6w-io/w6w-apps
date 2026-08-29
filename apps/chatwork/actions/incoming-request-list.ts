import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";

/**
 * `GET /incoming_requests` — pending contact requests sent to me.
 *
 * Documents a `204 No Content` for the empty case; {@link ChatworkClient.list}
 * normalises that to `[]`.
 */
const incomingRequestList: ActionDefinition<Record<string, never>> = {
  key: "incoming-request-list",
  type: "read",
  resource: "contact-request",
  title: "List Contact Requests",
  description: "List pending contact requests sent to the connected account.",
  params: [],
  output: [
    { key: "request_id", type: "number", label: "Request ID" },
    { key: "account_id", type: "number", label: "Requester's account ID" },
    { key: "message", type: "string", label: "Message included with the request" },
    { key: "name", type: "string", label: "Requester's display name" },
    { key: "chatwork_id", type: "string", label: "Requester's Chatwork ID" },
    { key: "organization_id", type: "number", label: "Requester's organization ID" },
    { key: "organization_name", type: "string", label: "Requester's organization name" },
    { key: "department", type: "string", label: "Requester's department" },
    { key: "avatar_image_url", type: "string", label: "Requester's avatar image URL" },
  ],

  execute(_input, ctx) {
    return new ChatworkClient(ctx).list("/incoming_requests");
  },
};

export default incomingRequestList;
