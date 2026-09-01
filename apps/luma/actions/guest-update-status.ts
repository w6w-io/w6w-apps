import type { ActionDefinition } from "@w6w/types";
import { compact, LumaClient } from "../lib/client.ts";
import { eventIdParam, guestIdParam } from "../lib/params.ts";

interface Input {
  eventId: string;
  guestId: string;
  status: "approved" | "declined" | "pending_approval" | "waitlist";
  shouldRefund?: boolean;
  sendEmail?: boolean;
  message?: string;
}

/** `POST /v1/events/guests/update-status`. */
const guestUpdateStatus: ActionDefinition<Input> = {
  key: "guest-update-status",
  type: "perform",
  resource: "guest",
  title: "Update Guest Status",
  description: "Approve, decline, waitlist or re-queue a guest for approval.",
  idempotent: true,
  params: [
    eventIdParam,
    guestIdParam,
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "approved", label: "Approved" },
        { value: "declined", label: "Declined" },
        { value: "pending_approval", label: "Pending approval" },
        { value: "waitlist", label: "Waitlisted" },
      ],
    },
    {
      key: "shouldRefund",
      label: "Refund on decline/waitlist/pending",
      type: "boolean",
      hint: "Only relevant when moving a guest who already paid away from approved. Defaults to " +
        "false.",
    },
    {
      key: "sendEmail",
      label: "Email the guest",
      type: "boolean",
      default: true,
      hint: "Whether Luma should email the guest about this status change.",
    },
    {
      key: "message",
      label: "Message",
      type: "text",
      validation: { maxLength: 200 },
      hint:
        "Personal message in the notification email. Cannot be combined with turning email off.",
    },
  ],
  output: [],

  async execute(input, ctx) {
    await new LumaClient(ctx).json("/v1/events/guests/update-status", {
      method: "POST",
      body: compact({
        event_id: input.eventId,
        guest_id: input.guestId,
        status: input.status,
        should_refund: input.shouldRefund,
        send_email: input.sendEmail,
        message: input.message,
      }),
    });
    return { ok: true };
  },
};

export default guestUpdateStatus;
