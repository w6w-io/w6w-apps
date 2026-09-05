import type { ActionDefinition } from "@w6w/types";
import { GotoWebinarClient, resolveOrganizerKey } from "../lib/client.ts";

interface Input {
  organizerKey?: string;
  webinarKey: string;
}

const webinarGet: ActionDefinition<Input> = {
  key: "webinar-get",
  type: "read",
  resource: "webinar",
  title: "Get Webinar",
  description: "Read a single webinar's details.",
  params: [
    {
      key: "organizerKey",
      label: "Organizer key",
      type: "string",
      hint: "Defaults to the key captured when this connection was made.",
    },
    { key: "webinarKey", label: "Webinar key", type: "string", required: true },
  ],
  output: [
    { key: "webinarKey", type: "string", label: "Webinar key" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "description", type: "string", label: "Description" },
    { key: "times", type: "array", label: "Times" },
    { key: "registrationUrl", type: "string", label: "Registration URL" },
    { key: "numberOfRegistrants", type: "number", label: "Number of registrants" },
  ],

  async execute(input, ctx) {
    const organizerKey = resolveOrganizerKey(ctx.connection, input.organizerKey);
    return await new GotoWebinarClient(ctx).request(
      `/organizers/${organizerKey}/webinars/${input.webinarKey}`,
    );
  },
};

export default webinarGet;
