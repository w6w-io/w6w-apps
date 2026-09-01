import type { ActionDefinition } from "@w6w/types";
import { LumaClient } from "../lib/client.ts";
import { eventIdParam } from "../lib/params.ts";

interface Input {
  eventId: string;
  email: string;
}

/** `POST /v1/events/hosts/remove`. Empty response on success. */
const eventHostRemove: ActionDefinition<Input> = {
  key: "event-host-remove",
  type: "perform",
  resource: "host",
  title: "Remove Event Host",
  description: "Remove a host from an event.",
  idempotent: true,
  params: [
    eventIdParam,
    { key: "email", label: "Email", type: "string", required: true, hint: "Host to remove." },
  ],
  output: [],

  async execute(input, ctx) {
    await new LumaClient(ctx).json("/v1/events/hosts/remove", {
      method: "POST",
      body: { event_id: input.eventId, email: input.email },
    });
    return { ok: true };
  },
};

export default eventHostRemove;
