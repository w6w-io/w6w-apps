import type { ActionDefinition } from "@w6w/types";
import { BlandClient } from "../lib/client.ts";

/**
 * `POST /v1/calls/active/transfer` — transfer an in-progress call.
 *
 * Verified against `docs.bland.ai/api-v1/post/calls-active-transfer`. Only
 * calls in `queue_status: "started"` are eligible; a call already transferred
 * or completed answers a documented `NOT_FOUND`/`FORBIDDEN` error. Response is
 * the newer `{"data": {"message"}, "errors": null}` envelope.
 */
interface Input {
  callId: string;
  transferNumber: string;
}

const callTransfer: ActionDefinition<Input> = {
  key: "call-transfer",
  type: "perform",
  resource: "call",
  title: "Transfer Active Call",
  description: "Transfer an in-progress call to a different phone number.",
  // A retry after the call already moved on (or was transferred once) hits a
  // different call state and answers a documented error rather than
  // re-transferring silently — not safe to mark idempotent.
  idempotent: false,
  params: [
    { key: "callId", label: "Call ID", type: "string", required: true },
    {
      key: "transferNumber",
      label: "Transfer To",
      type: "string",
      required: true,
      hint: "E.164 format, e.g. +12223334444.",
    },
  ],
  output: [
    { key: "message", type: "string", label: "Confirmation message" },
  ],

  async execute(input, ctx) {
    const data = await new BlandClient(ctx).data<{ message?: string }>(
      "/v1/calls/active/transfer",
      { method: "POST", body: { call_id: input.callId, transfer_number: input.transferNumber } },
    );
    return { message: data?.message };
  },
};

export default callTransfer;
