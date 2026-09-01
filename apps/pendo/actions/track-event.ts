import type { ActionDefinition } from "@w6w/types";
import { compact, json, PendoClient } from "../lib/client.ts";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

/**
 * `POST /data/track` — record a user action as a Pendo track event.
 *
 * Needs the Track Event Shared Secret, not the Integration Key — see
 * `auth/integration-key.ts`. If that secret is unset on the connection, this
 * fails even though every other action on the same connection works fine.
 *
 * ## A timestamp older than "now" is quietly deferred, not rejected
 *
 * Pendo's own docs: an event whose `timestamp` is in the past "will not be
 * processed with the regular hourly processing and will only appear in the
 * UI after Pendo's daily and weekly event reprocessing", and one more than
 * seven days old "may not be processed" at all. The request still returns
 * 200 either way — nothing in the response says the event was deferred or
 * dropped. This action warns (and, past seven days, warns loudly) rather
 * than silently sending a payload most workflows would assume landed within
 * the hour.
 */
const action: ActionDefinition = {
  key: "track-event",
  type: "perform",
  resource: "event",
  title: "Track Event",
  description:
    "Record a user action as a Pendo track event. Needs the Track Event Shared Secret — a " +
    "DIFFERENT credential from the Integration Key used by every other action here. A " +
    "timestamp older than now is silently deferred to Pendo's daily/weekly reprocessing rather " +
    "than the regular hourly job, and one over 7 days old may not be processed at all.",
  idempotent: false,
  params: [
    {
      key: "event",
      label: "Event Name",
      type: "string",
      required: true,
      hint: 'Name of the action the user performed, e.g. "Registered" or "Upgraded Plan".',
    },
    {
      key: "visitorId",
      label: "Visitor ID",
      type: "string",
      required: true,
      hint: "Unique string identifier for the visitor.",
    },
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      hint: "Unique string identifier for the account this visitor belongs to. Strongly " +
        "recommended by Pendo, though not enforced.",
    },
    {
      key: "timestamp",
      label: "Timestamp (ms)",
      type: "number",
      hint: "Milliseconds since the epoch. Leave blank to use the current time — Pendo only " +
        "processes an event within the regular hourly job when its timestamp IS the current " +
        "time; anything older waits for daily/weekly reprocessing, and anything over 7 days " +
        "old may not be processed at all.",
    },
    {
      key: "properties",
      label: "Properties",
      type: "json",
      default: "",
      hint: 'Free-form JSON object describing the event, e.g. {"plan":"pro","seats":5}.',
    },
    {
      key: "context",
      label: "Browser Context",
      type: "json",
      default: "",
      advanced: true,
      hint: "Only for an event tracked on behalf of a browser session your code did not run " +
        'in — {"ip":"…","userAgent":"…","url":"…","title":"…"}. Omit for server-side or ' +
        "system events.",
    },
  ],
  output: [
    { key: "sent", type: "boolean", label: "Pendo accepted the request" },
    { key: "deferred", type: "boolean", label: "Timestamp was in the past — not processed hourly" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    if (!p.event) throw new Error("`event` is required");
    if (!p.visitorId) throw new Error("`visitorId` is required");

    const now = Date.now();
    const timestamp = typeof p.timestamp === "number" && p.timestamp > 0 ? p.timestamp : now;
    const age = now - timestamp;
    let deferred = false;

    if (age > SEVEN_DAYS_MS) {
      ctx.log(
        "warn",
        "event timestamp is more than 7 days old — Pendo may not process it at all",
        { ageMs: age },
      );
      deferred = true;
    } else if (age > FIVE_MINUTES_MS) {
      ctx.log(
        "warn",
        "event timestamp is in the past — Pendo defers it to daily/weekly reprocessing " +
          "instead of the regular hourly job",
        { ageMs: age },
      );
      deferred = true;
    }

    const body = compact({
      type: "track",
      event: p.event,
      visitorId: p.visitorId,
      accountId: p.accountId,
      timestamp,
      properties: json(p.properties, "properties"),
      context: json(p.context, "context"),
    });

    const client = new PendoClient(ctx);
    await client.track(body);

    ctx.log("info", "sent track event to Pendo", { deferred });
    return { sent: true, deferred };
  },
};

export default action;
