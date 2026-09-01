import type { ActionDefinition } from "@w6w/types";
import { compact, LumaClient } from "../lib/client.ts";
import { eventIdParam } from "../lib/params.ts";

interface Input {
  eventId: string;
  cancellationToken: string;
  shouldRefund?: boolean;
}

/**
 * `POST /v1/events/cancel` — step 2, confirms a cancellation started by
 * `event-cancel-request`. Required if the event has paid guests
 * (`is_paid: true` in that step's response).
 */
const eventCancel: ActionDefinition<Input> = {
  key: "event-cancel",
  type: "perform",
  resource: "event",
  title: "Confirm Event Cancellation",
  description:
    "Confirm cancelling an event, using the cancellation_token from Request Event Cancellation.",
  idempotent: false,
  params: [
    eventIdParam,
    {
      key: "cancellationToken",
      label: "Cancellation token",
      type: "string",
      required: true,
      hint: "From Request Event Cancellation's response. Expires after 15 minutes.",
    },
    {
      key: "shouldRefund",
      label: "Refund paid guests",
      type: "boolean",
      hint: "Required if the event has paid guests.",
    },
  ],
  output: [],

  async execute(input, ctx) {
    await new LumaClient(ctx).json("/v1/events/cancel", {
      method: "POST",
      body: compact({
        event_id: input.eventId,
        cancellation_token: input.cancellationToken,
        should_refund: input.shouldRefund,
      }),
    });
    return { ok: true };
  },
};

export default eventCancel;
