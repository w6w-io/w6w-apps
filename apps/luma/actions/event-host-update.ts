import type { ActionDefinition } from "@w6w/types";
import { compact, LumaClient } from "../lib/client.ts";
import { eventIdParam } from "../lib/params.ts";

interface Input {
  eventId: string;
  email: string;
  accessLevel?: "none" | "check-in" | "manager";
  isVisible?: boolean;
}

/**
 * `POST /v1/events/hosts/update`. Empty response on success. The event
 * creator's own access level cannot be changed, per the vendor's own field
 * description — this app does not special-case that; Luma's own 4xx applies.
 */
const eventHostUpdate: ActionDefinition<Input> = {
  key: "event-host-update",
  type: "perform",
  resource: "host",
  title: "Update Event Host",
  description: "Change an existing event host's access level or visibility.",
  idempotent: true,
  params: [
    eventIdParam,
    { key: "email", label: "Email", type: "string", required: true, hint: "Host to update." },
    {
      key: "accessLevel",
      label: "Access level",
      type: "select",
      options: [
        { value: "none", label: "None" },
        { value: "check-in", label: "Check-in" },
        { value: "manager", label: "Manager" },
      ],
    },
    { key: "isVisible", label: "Visible on event page", type: "boolean" },
  ],
  output: [],

  async execute(input, ctx) {
    await new LumaClient(ctx).json("/v1/events/hosts/update", {
      method: "POST",
      body: compact({
        event_id: input.eventId,
        email: input.email,
        access_level: input.accessLevel,
        is_visible: input.isVisible,
      }),
    });
    return { ok: true };
  },
};

export default eventHostUpdate;
