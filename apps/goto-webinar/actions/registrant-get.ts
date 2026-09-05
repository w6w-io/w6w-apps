import type { ActionDefinition } from "@w6w/types";
import { GotoWebinarClient, resolveOrganizerKey } from "../lib/client.ts";

interface Input {
  organizerKey?: string;
  webinarKey: string;
  registrantKey: string;
}

const registrantGet: ActionDefinition<Input> = {
  key: "registrant-get",
  type: "read",
  resource: "registrant",
  title: "Get Registrant",
  description: "Read a single registrant's details.",
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
  output: [
    { key: "registrantKey", type: "number", label: "Registrant key" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status" },
    { key: "joinUrl", type: "string", label: "Join URL" },
  ],

  async execute(input, ctx) {
    const organizerKey = resolveOrganizerKey(ctx.connection, input.organizerKey);
    return await new GotoWebinarClient(ctx).request(
      `/organizers/${organizerKey}/webinars/${input.webinarKey}/registrants/${input.registrantKey}`,
    );
  },
};

export default registrantGet;
