import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";
import { requestIdParam } from "../lib/params.ts";

interface Input {
  requestId: number;
}

/**
 * `DELETE /incoming_requests/{request_id}` — reject a pending contact
 * request. Answers `204 No Content` on success.
 */
const incomingRequestReject: ActionDefinition<Input> = {
  key: "incoming-request-reject",
  type: "perform",
  resource: "contact-request",
  title: "Reject Contact Request",
  description: "Reject a pending contact request.",
  idempotent: true,
  params: [requestIdParam],
  output: [],

  async execute(input, ctx) {
    await new ChatworkClient(ctx).json(`/incoming_requests/${input.requestId}`, {
      method: "DELETE",
    });
    return {};
  },
};

export default incomingRequestReject;
