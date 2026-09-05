import type { ActionDefinition } from "@w6w/types";
import { GotoWebinarClient, resolveOrganizerKey } from "../lib/client.ts";

interface Input {
  organizerKey?: string;
  webinarKey: string;
  registrantKey: string;
}

const registrantDelete: ActionDefinition<Input> = {
  key: "registrant-delete",
  type: "perform",
  resource: "registrant",
  title: "Delete Registrant",
  description: "Remove a registrant from a webinar.",
  idempotent: true,
  params: [
    {
      key: "organizerKey",
      label: "Organizer key",
      type: "string",
      hint: "Defaults to the key captured when this connection was made.",
    },
    { key: "webinarKey", label: "Webinar key", type: "string", required: true },
    { key: "registrantKey", label: "Registrant key", type: "string", required: true },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const organizerKey = resolveOrganizerKey(ctx.connection, input.organizerKey);
    const status = await new GotoWebinarClient(ctx).status(
      `/organizers/${organizerKey}/webinars/${input.webinarKey}/registrants/${input.registrantKey}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default registrantDelete;
