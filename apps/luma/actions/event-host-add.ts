import type { ActionDefinition } from "@w6w/types";
import { compact, LumaClient } from "../lib/client.ts";
import { eventIdParam } from "../lib/params.ts";

interface Input {
  eventId: string;
  email: string;
  accessLevel?: "none" | "check-in" | "manager";
  isVisible?: boolean;
  name?: string;
}

/** `POST /v1/events/hosts/add`. Empty response on success. */
const eventHostAdd: ActionDefinition<Input> = {
  key: "event-host-add",
  type: "perform",
  resource: "host",
  title: "Add Event Host",
  description: "Add a host to an event.",
  idempotent: true,
  params: [
    eventIdParam,
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "accessLevel",
      label: "Access level",
      type: "select",
      default: "manager",
      options: [
        { value: "none", label: "None" },
        { value: "check-in", label: "Check-in" },
        { value: "manager", label: "Manager" },
      ],
    },
    { key: "isVisible", label: "Visible on event page", type: "boolean", default: true },
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: "Ignored if this person already has a Luma profile.",
    },
  ],
  output: [],

  async execute(input, ctx) {
    await new LumaClient(ctx).json("/v1/events/hosts/add", {
      method: "POST",
      body: compact({
        event_id: input.eventId,
        email: input.email,
        access_level: input.accessLevel,
        is_visible: input.isVisible,
        name: input.name,
      }),
    });
    return { ok: true };
  },
};

export default eventHostAdd;
