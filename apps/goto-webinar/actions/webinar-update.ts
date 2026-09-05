import type { ActionDefinition } from "@w6w/types";
import { GotoWebinarClient, resolveOrganizerKey, unset, type WebinarTime } from "../lib/client.ts";

/**
 * `PUT /organizers/{organizerKey}/webinars/{webinarKey}` — update a webinar.
 *
 * Answers `202 Accepted`, not `200`/`204` — GoTo applies the change asynchronously, so a
 * workflow reading the webinar back immediately after this action may still see stale fields.
 */
interface Input {
  organizerKey?: string;
  webinarKey: string;
  subject?: string;
  description?: string;
  times?: WebinarTime[];
  timeZone?: string;
  notifyParticipants?: boolean;
}

const webinarUpdate: ActionDefinition<Input> = {
  key: "webinar-update",
  type: "perform",
  resource: "webinar",
  title: "Update Webinar",
  description: "Update a webinar's subject, description, times or time zone.",
  idempotent: true,
  params: [
    {
      key: "organizerKey",
      label: "Organizer key",
      type: "string",
      hint: "Defaults to the key captured when this connection was made.",
    },
    { key: "webinarKey", label: "Webinar key", type: "string", required: true },
    { key: "subject", label: "Subject", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "times",
      label: "Times",
      type: "json",
      hint: 'Array of {"startTime","endTime"} ISO-8601 windows.',
    },
    { key: "timeZone", label: "Time zone", type: "string" },
    {
      key: "notifyParticipants",
      label: "Notify participants",
      type: "boolean",
      default: false,
      hint: "Send notification emails about this change.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const organizerKey = resolveOrganizerKey(ctx.connection, input.organizerKey);
    const status = await new GotoWebinarClient(ctx).status(
      `/organizers/${organizerKey}/webinars/${input.webinarKey}`,
      {
        method: "PUT",
        query: { notifyParticipants: input.notifyParticipants },
        body: {
          subject: unset(input.subject),
          description: unset(input.description),
          times: input.times,
          timeZone: unset(input.timeZone),
        },
      },
    );
    return { status };
  },
};

export default webinarUpdate;
