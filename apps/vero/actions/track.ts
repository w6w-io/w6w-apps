import type { ActionDefinition } from "@w6w/types";
import { compact, parseJsonParam, request } from "../lib/client.ts";

/**
 * `POST /events/track` — records an event for a user, creating their profile
 * if it doesn't already exist. Verified 2026-09-01 against Vero's OpenAPI
 * schema embedded in help.getvero.com/api-reference/events/track
 * (`originalFileLocation: "api-reference/track/track.yml"`).
 *
 * At least one of `id` / `email` is required to identify the subject — a
 * server-side REST call carries no browser session, unlike the JS SDK, which
 * can fall back to a previously-called `user.identify`'s local-storage state.
 *
 * `idempotent: true` — unlike some vendors' Track APIs, Vero documents an
 * automatic five-minute dedupe window keyed on `auth_token` + `event_name` +
 * `identifier` + (`data`, or a `check_id` when no `data` is sent), so a host
 * retry that resends the identical call converges on the original event
 * rather than double-firing it, as long as the retry lands inside that
 * window. `createdAt` participates in that key (via `extras`), so setting a
 * fixed value on every retry of the same logical event is what keeps them
 * deduped past five minutes.
 */
const track: ActionDefinition = {
  key: "track",
  type: "perform",
  resource: "event",
  title: "Track Event",
  description: "Record an event for a user, creating their profile if it doesn't exist.",
  idempotent: true,
  params: [
    { key: "id", label: "User ID", type: "string", hint: "The user's unique identifier." },
    { key: "email", label: "Email", type: "string", hint: "The user's email address." },
    {
      key: "eventName",
      label: "Event Name",
      type: "string",
      required: true,
      hint: 'Name of the event, e.g. "Viewed product". Vero treats case and word separators as ' +
        "equivalent when matching events.",
    },
    {
      key: "data",
      label: "Data",
      type: "json",
      hint: 'Event properties, e.g. { "product_name": "Red T-shirt" }.',
    },
    {
      key: "source",
      label: "Source",
      type: "string",
      advanced: true,
      hint: 'Where the event came from, e.g. "Segment.com".',
    },
    {
      key: "createdAt",
      label: "Created At",
      type: "string",
      advanced: true,
      hint: "ISO 8601 timestamp for when the event occurred. Also participates in the " +
        "deduplication key.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Accepted by Vero" },
    { key: "message", type: "string", label: "Vero's response message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = typeof p.id === "string" ? p.id.trim() : "";
    const email = typeof p.email === "string" ? p.email.trim() : "";
    if (!id && !email) throw new Error("either `id` or `email` is required");
    const eventName = typeof p.eventName === "string" ? p.eventName.trim() : "";
    if (!eventName) throw new Error("`eventName` is required");

    const data = parseJsonParam(p.data);
    const extras = compact({
      source: typeof p.source === "string" && p.source ? p.source : undefined,
      created_at: typeof p.createdAt === "string" && p.createdAt ? p.createdAt : undefined,
    });

    const body = compact({
      identity: compact({ id: id || undefined, email: email || undefined }),
      event_name: eventName,
      data,
      extras: Object.keys(extras).length ? extras : undefined,
    });

    ctx.log("info", "Vero track", { eventName });
    return await request(ctx, "POST", "/events/track", body);
  },
};

export default track;
