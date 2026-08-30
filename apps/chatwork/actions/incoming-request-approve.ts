import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";
import { requestIdParam } from "../lib/params.ts";

interface Input {
  requestId: number;
}

/** `PUT /incoming_requests/{request_id}` — approve a pending contact request. */
const incomingRequestApprove: ActionDefinition<Input> = {
  key: "incoming-request-approve",
  type: "perform",
  resource: "contact-request",
  title: "Approve Contact Request",
  description: "Approve a pending contact request, adding the requester as a contact.",
  idempotent: true,
  params: [requestIdParam],
  output: [
    { key: "account_id", type: "number", label: "New contact's account ID" },
    { key: "room_id", type: "number", label: "New direct-chat room ID" },
    { key: "name", type: "string", label: "New contact's display name" },
    { key: "chatwork_id", type: "string", label: "New contact's Chatwork ID" },
    { key: "organization_id", type: "number", label: "New contact's organization ID" },
    { key: "organization_name", type: "string", label: "New contact's organization name" },
    { key: "department", type: "string", label: "New contact's department" },
    { key: "avatar_image_url", type: "string", label: "New contact's avatar image URL" },
  ],

  execute(input, ctx) {
    return new ChatworkClient(ctx).json(`/incoming_requests/${input.requestId}`, {
      method: "PUT",
    });
  },
};

export default incomingRequestApprove;
