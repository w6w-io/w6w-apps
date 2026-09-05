import type { ActionDefinition } from "@w6w/types";
import { GotoWebinarClient, resolveOrganizerKey } from "../lib/client.ts";

interface Input {
  organizerKey?: string;
  webinarKey: string;
}

const panelistList: ActionDefinition<Input> = {
  key: "panelist-list",
  type: "search",
  resource: "panelist",
  title: "List Panelists",
  description: "List a webinar's panelists.",
  params: [
    {
      key: "organizerKey",
      label: "Organizer key",
      type: "string",
      hint: "Defaults to the key captured when this connection was made.",
    },
    { key: "webinarKey", label: "Webinar key", type: "string", required: true },
  ],
  output: [{ key: "panelists", type: "array", label: "Panelists" }],

  async execute(input, ctx) {
    const organizerKey = resolveOrganizerKey(ctx.connection, input.organizerKey);
    const body = await new GotoWebinarClient(ctx).request<unknown[]>(
      `/organizers/${organizerKey}/webinars/${input.webinarKey}/panelists`,
    );
    return { panelists: body ?? [] };
  },
};

export default panelistList;
