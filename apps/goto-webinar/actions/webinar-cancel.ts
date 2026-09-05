import type { ActionDefinition } from "@w6w/types";
import { GotoWebinarClient, resolveOrganizerKey } from "../lib/client.ts";

/**
 * `DELETE /organizers/{organizerKey}/webinars/{webinarKey}` — cancel a webinar.
 *
 * `sendCancellationEmails` defaults `false` here (the vendor's own default), and
 * `deleteAll` defaults `true` (also the vendor's own documented default: for a series, all
 * remaining scheduled sessions are cancelled unless told otherwise).
 */
interface Input {
  organizerKey?: string;
  webinarKey: string;
  sendCancellationEmails?: boolean;
  deleteAll?: boolean;
}

const webinarCancel: ActionDefinition<Input> = {
  key: "webinar-cancel",
  type: "perform",
  resource: "webinar",
  title: "Cancel Webinar",
  description: "Cancel a webinar (or, for a series, all of its remaining sessions).",
  idempotent: true,
  params: [
    {
      key: "organizerKey",
      label: "Organizer key",
      type: "string",
      hint: "Defaults to the key captured when this connection was made.",
    },
    { key: "webinarKey", label: "Webinar key", type: "string", required: true },
    {
      key: "sendCancellationEmails",
      label: "Send cancellation emails",
      type: "boolean",
      default: false,
    },
    {
      key: "deleteAll",
      label: "Delete all sessions (series)",
      type: "boolean",
      default: true,
      hint: "If this webinar is part of a series, cancel every remaining scheduled session.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const organizerKey = resolveOrganizerKey(ctx.connection, input.organizerKey);
    const status = await new GotoWebinarClient(ctx).status(
      `/organizers/${organizerKey}/webinars/${input.webinarKey}`,
      {
        method: "DELETE",
        query: {
          sendCancellationEmails: input.sendCancellationEmails,
          deleteAll: input.deleteAll,
        },
      },
    );
    return { status };
  },
};

export default webinarCancel;
