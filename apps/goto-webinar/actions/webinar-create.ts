import type { ActionDefinition } from "@w6w/types";
import { GotoWebinarClient, resolveOrganizerKey, unset, type WebinarTime } from "../lib/client.ts";

/**
 * `POST /organizers/{organizerKey}/webinars` — schedule a webinar.
 *
 * `type` picks the shape: `single_session` (the default when omitted) needs exactly one entry
 * in `times`; `series` needs one entry per session (attendees pick which one to join);
 * `sequence` needs a `recurrenceStart`/`recurrencePattern`/`recurrenceEnd` shape this action
 * does not expose — only the `single_session` and `series` forms (a plain `times` array) are
 * covered here, since `sequence`'s recurrence-rule body was not exercised against a live
 * account and guessing its field names risks silently scheduling the wrong cadence.
 */
interface Input {
  organizerKey?: string;
  subject: string;
  description?: string;
  times: WebinarTime[];
  timeZone?: string;
  type?: "single_session" | "series";
  isPasswordProtected?: boolean;
}

const webinarCreate: ActionDefinition<Input> = {
  key: "webinar-create",
  type: "perform",
  resource: "webinar",
  title: "Create Webinar",
  description: "Schedule a single-session or multi-session (series) webinar.",
  idempotent: false,
  params: [
    {
      key: "organizerKey",
      label: "Organizer key",
      type: "string",
      hint: "Defaults to the key captured when this connection was made.",
    },
    { key: "subject", label: "Subject", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    {
      key: "times",
      label: "Times",
      type: "json",
      required: true,
      hint: 'Array of {"startTime","endTime"} ISO-8601 windows. One entry for a single session; ' +
        "one per session for a series.",
    },
    { key: "timeZone", label: "Time zone", type: "string", hint: "e.g. America/New_York" },
    {
      key: "type",
      label: "Type",
      type: "select",
      default: "single_session",
      options: [
        { value: "single_session", label: "Single session" },
        { value: "series", label: "Series (attendees pick one session)" },
      ],
    },
    { key: "isPasswordProtected", label: "Password protected", type: "boolean", default: false },
  ],
  output: [
    { key: "webinarKey", type: "string", label: "Webinar key" },
    { key: "recurrenceKey", type: "string", label: "Recurrence key (series only)" },
  ],

  async execute(input, ctx) {
    const organizerKey = resolveOrganizerKey(ctx.connection, input.organizerKey);
    ctx.log("info", "creating webinar", { organizerKey, subject: input.subject });
    return await new GotoWebinarClient(ctx).request(`/organizers/${organizerKey}/webinars`, {
      method: "POST",
      body: {
        subject: input.subject,
        description: unset(input.description),
        times: input.times,
        timeZone: unset(input.timeZone),
        type: input.type,
        isPasswordProtected: input.isPasswordProtected,
      },
    });
  },
};

export default webinarCreate;
