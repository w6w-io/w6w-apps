import type { ActionDefinition } from "@w6w/types";
import { DatadogClient, toList } from "../lib/client.ts";
import { asInteger } from "../lib/params.ts";

/**
 * `POST /api/v2/downtime` — mute monitors for a window. The deploy-window
 * action.
 *
 * ## Two required fields, and the second one is easy to miss
 *
 * Datadog requires **both** `scope` and `monitor_identifier`, and they mean
 * different things:
 *
 *  - `scope` selects which *monitored things* are silenced, by the tags in a
 *    monitor's query — `env:staging`, `host:web-01`.
 *  - `monitor_identifier` selects which *monitors* the downtime applies to, and
 *    is a `oneOf`: `{monitor_id: <int>}` for exactly one monitor, or
 *    `{monitor_tags: [...]}` for every monitor carrying **all** of those tags.
 *
 * Omitting `monitor_identifier` is a 400. Datadog's documented way to say "every
 * monitor in this scope" is `monitor_tags: ["*"]`, which is what this action
 * sends when neither field is filled — stated in the hint rather than left as a
 * silent default, because it is a broad thing to do by accident.
 *
 * ## `start` and `end` need a zero UTC offset
 *
 * The one-time schedule is ISO-8601 and Datadog's schema says both "must include
 * a UTC offset of zero". `2026-08-11T09:00:00+02:00` is refused; the same
 * instant as `2026-08-11T07:00:00Z` is accepted. Omitting `start` begins the
 * downtime immediately; omitting `end` makes it **run forever**, which is a
 * silent way to leave production unmonitored.
 *
 * Recurring schedules (`recurrences` with RRULEs) are not exposed — see the
 * README.
 *
 * ## Not idempotent
 *
 * There is no idempotency key. A retry schedules a second overlapping downtime,
 * each with its own UUID, and cancelling one leaves the other muting.
 *
 * Needs the application key and the `monitors_downtime` scope.
 */
interface Input {
  scope: string;
  monitorId?: number | string;
  monitorTags?: string;
  start?: string;
  end?: string;
  message?: string;
  muteFirstRecoveryNotification?: boolean;
  displayTimezone?: string;
}

const downtimeSchedule: ActionDefinition<Input> = {
  key: "downtime-schedule",
  type: "perform",
  resource: "downtime",
  title: "Schedule Downtime",
  description: "Mute monitors for a scope over a time window.",
  idempotent: false,
  params: [
    {
      key: "scope",
      label: "Scope",
      type: "string",
      required: true,
      placeholder: "env:staging",
      hint: "Which monitored things go quiet, matched against the tags in a monitor's query. " +
        "Uses Datadog's common search syntax.",
    },
    {
      key: "monitorId",
      label: "Monitor ID",
      type: "number",
      validation: { integer: true },
      hint: "Silence exactly this monitor. Leave both this and Monitor tags empty to silence " +
        'every monitor in the scope (Datadog spells that `monitor_tags: ["*"]`).',
    },
    {
      key: "monitorTags",
      label: "Monitor tags",
      type: "string",
      placeholder: "team:payments,service:checkout",
      hint: "Comma-separated. Applies to monitors carrying **all** of these tags. These are tags " +
        "on the monitor itself, not tags in its query. Ignored when Monitor ID is set.",
    },
    {
      key: "start",
      label: "Start",
      type: "string",
      placeholder: "2026-08-11T07:00:00Z",
      hint: "ISO-8601 with a **zero UTC offset** — Datadog rejects `+02:00`. Empty means start " +
        "now.",
    },
    {
      key: "end",
      label: "End",
      type: "string",
      placeholder: "2026-08-11T08:00:00Z",
      hint: "ISO-8601 with a **zero UTC offset**. Leaving this empty means the downtime never " +
        "ends.",
    },
    {
      key: "message",
      label: "Message",
      type: "text",
      advanced: true,
      hint: "Included in downtime notifications. `@username` mentions work as they do in events.",
    },
    {
      key: "muteFirstRecoveryNotification",
      label: "Mute first recovery notification",
      type: "boolean",
      advanced: true,
    },
    {
      key: "displayTimezone",
      label: "Display timezone",
      type: "string",
      advanced: true,
      placeholder: "UTC",
      hint: "Affects only how Datadog *displays* the window. It is not applied as an offset to " +
        "the times above.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The created downtime" },
    { key: "id", type: "string", label: "Downtime UUID, for Cancel Downtime" },
  ],

  async execute(input, ctx) {
    const monitorTags = toList(input.monitorTags);
    const identifier = input.monitorId !== undefined && input.monitorId !== null &&
        input.monitorId !== ""
      ? { monitor_id: asInteger(input.monitorId, "Monitor ID") }
      : { monitor_tags: monitorTags ?? ["*"] };

    const attributes: Record<string, unknown> = {
      scope: input.scope,
      monitor_identifier: identifier,
    };
    if (input.message) attributes.message = input.message;
    if (input.displayTimezone) attributes.display_timezone = input.displayTimezone;
    if (input.muteFirstRecoveryNotification !== undefined) {
      attributes.mute_first_recovery_notification = input.muteFirstRecoveryNotification;
    }
    if (input.start || input.end) {
      const schedule: Record<string, unknown> = {};
      if (input.start) schedule.start = input.start;
      if (input.end) schedule.end = input.end;
      attributes.schedule = schedule;
    }

    const result = await new DatadogClient(ctx).json<{ data?: { id?: string } }>(
      "/api/v2/downtime",
      { method: "POST", body: { data: { type: "downtime", attributes } } },
    );
    ctx.log("info", "scheduled downtime", { scope: input.scope, id: result?.data?.id });
    return { data: result?.data, id: result?.data?.id };
  },
};

export default downtimeSchedule;
