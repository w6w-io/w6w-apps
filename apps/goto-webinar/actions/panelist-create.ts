import type { ActionDefinition } from "@w6w/types";
import { GotoWebinarClient, resolveOrganizerKey } from "../lib/client.ts";

/**
 * `POST /organizers/{organizerKey}/webinars/{webinarKey}/panelists` — invite panelists.
 *
 * The documented request body is a **top-level JSON array** of `{email, name}` — not an
 * object wrapping a list, unlike every other write in this API. This action exposes it as
 * one panelist per call (the common case) to keep the param form simple; `execute` wraps the
 * single entry in the array the vendor requires.
 */
interface Input {
  organizerKey?: string;
  webinarKey: string;
  email: string;
  name: string;
}

const panelistCreate: ActionDefinition<Input> = {
  key: "panelist-create",
  type: "perform",
  resource: "panelist",
  title: "Create Panelist",
  description: "Invite a panelist to a webinar.",
  idempotent: false,
  params: [
    {
      key: "organizerKey",
      label: "Organizer key",
      type: "string",
      hint: "Defaults to the key captured when this connection was made.",
    },
    { key: "webinarKey", label: "Webinar key", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
  ],
  output: [
    { key: "panelistId", type: "number", label: "Panelist id" },
    { key: "joinLink", type: "string", label: "Join link" },
  ],

  async execute(input, ctx) {
    const organizerKey = resolveOrganizerKey(ctx.connection, input.organizerKey);
    const created = await new GotoWebinarClient(ctx).request<Array<Record<string, unknown>>>(
      `/organizers/${organizerKey}/webinars/${input.webinarKey}/panelists`,
      { method: "POST", body: [{ email: input.email, name: input.name }] },
    );
    return created?.[0] ?? {};
  },
};

export default panelistCreate;
