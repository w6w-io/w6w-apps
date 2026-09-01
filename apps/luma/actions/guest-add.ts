import type { ActionDefinition } from "@w6w/types";
import { compact, LumaClient } from "../lib/client.ts";
import { eventIdParam } from "../lib/params.ts";

interface GuestInput {
  email: string;
  name?: string;
}

interface Input {
  eventId: string;
  guests: GuestInput[];
  eventTicketTypeId?: string;
  approvalStatus?: "approved" | "pending_approval" | "waitlist";
  sendEmail?: boolean;
}

/**
 * `POST /v1/events/guests/add` — adds guests directly (they land in the
 * chosen `approvalStatus`, default `approved`). For a soft invite the guest
 * must accept, use Send Invites instead.
 *
 * `ticket` (single ticket type applied to every added guest) is exposed here;
 * `tickets` (several ticket types per guest, mutually exclusive with `ticket`
 * per the vendor's own body schema) is not — the common case of one ticket
 * type per bulk add is what this Action is for.
 *
 * `registration_answers` per guest is not exposed — this Action targets bulk
 * adds from a workflow, where per-guest custom-question answers are rarely
 * known in advance; use the guest-update actions after add if answers need
 * setting.
 */
const guestAdd: ActionDefinition<Input> = {
  key: "guest-add",
  type: "perform",
  resource: "guest",
  title: "Add Guests",
  description: "Add one or more guests directly to an event.",
  idempotent: false,
  params: [
    eventIdParam,
    {
      key: "guests",
      label: "Guests",
      type: "array",
      required: true,
      item: {
        type: "object",
        fields: [
          { key: "email", label: "Email", type: "string", required: true },
          {
            key: "name",
            label: "Name",
            type: "string",
            hint: "Ignored if this person already has a name on file.",
          },
        ],
      },
    },
    {
      key: "eventTicketTypeId",
      label: "Ticket type",
      type: "string",
      placeholder: "ttype-abc123",
      hint: "Assign one ticket of this type to each added guest. Leave empty for the event's " +
        "default ticket.",
    },
    {
      key: "approvalStatus",
      label: "Approval status",
      type: "select",
      default: "approved",
      options: [
        { value: "approved", label: "Approved (going)" },
        { value: "pending_approval", label: "Pending approval" },
        { value: "waitlist", label: "Waitlisted" },
      ],
    },
    {
      key: "sendEmail",
      label: "Email the guests",
      type: "boolean",
      default: true,
      hint: "Whether Luma should email each added guest.",
    },
  ],
  output: [],

  async execute(input, ctx) {
    await new LumaClient(ctx).json("/v1/events/guests/add", {
      method: "POST",
      body: compact({
        event_id: input.eventId,
        guests: input.guests.map((g) => compact({ email: g.email, name: g.name })),
        ticket: input.eventTicketTypeId
          ? { event_ticket_type_id: input.eventTicketTypeId }
          : undefined,
        approval_status: input.approvalStatus,
        send_email: input.sendEmail,
      }),
    });
    return { ok: true };
  },
};

export default guestAdd;
