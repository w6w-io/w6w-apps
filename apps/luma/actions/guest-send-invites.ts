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
  message?: string;
}

/**
 * `POST /v1/events/guests/send-invites` — a SOFT invite the recipient must
 * accept, unlike `guest-add` which registers them directly with
 * `approval_status: "invited"` unavailable to it. Use this when the guest
 * should choose to join; use `guest-add` when the workflow is the one
 * deciding they are going.
 */
const guestSendInvites: ActionDefinition<Input> = {
  key: "guest-send-invites",
  type: "perform",
  resource: "guest",
  title: "Send Invites",
  description: "Send soft invites (accept/decline) to one or more people for an event.",
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
          { key: "name", label: "Name", type: "string" },
        ],
      },
    },
    {
      key: "message",
      label: "Message",
      type: "text",
      validation: { maxLength: 200 },
      hint: "Personalizes the invite email.",
    },
  ],
  output: [],

  async execute(input, ctx) {
    await new LumaClient(ctx).json("/v1/events/guests/send-invites", {
      method: "POST",
      body: compact({
        event_id: input.eventId,
        guests: input.guests.map((g) => compact({ email: g.email, name: g.name })),
        message: input.message,
      }),
    });
    return { ok: true };
  },
};

export default guestSendInvites;
