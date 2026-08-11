import type { ActionDefinition } from "@w6w/types";
import { KeapClient, offsetOf, V1 } from "../lib/client.ts";

/**
 * `GET /rest/v1/appointments` — List Appointments. **v1, and deliberately so.**
 *
 * ## Why this one resource is not on v2
 *
 * It cannot be. Keap's v2 document declares 236 paths and **not one of them is
 * an appointment**; v1 declares four (`/appointments`,
 * `/appointments/{appointmentId}`, plus the model and custom-field endpoints).
 * Appointments are the one part of this app's surface where the older API is
 * not a fallback but the only option, and dropping them to stay v2-pure would
 * have removed a resource rather than modernised one.
 *
 * ## v1 pages differently, and the difference is not cosmetic
 *
 * v2 is cursor-based: `page_size` in, an opaque `next_page_token` out. v1 is
 * offset/limit and returns `next` as a **fully-formed absolute URL** with the
 * offset already baked in. The two are not interchangeable, so this action
 * exposes `limit`/`offset` — the v1 vocabulary — and reads the next offset back
 * out of that URL rather than handing a caller a URL to re-fetch blind.
 *
 * ## The OpenAPI declares this endpoint's query parameters wrong
 *
 * v1 declares a single required query parameter named
 * `appointmentSearchCommand` whose schema is an *object*, with no `style` or
 * `explode` to say how it serializes. There is no such parameter on the wire.
 * The real parameters are that object's own properties —
 * `since`, `until`, `limit`, `offset`, `contact_id` — sent flat, which is what
 * a Spring `@ModelAttribute` command object produces and what the v1 REST
 * documentation shows. That is a defect in the generated document, not a
 * different calling convention, and it is why this action's parameters do not
 * match the spec's parameter list.
 *
 * `sinceAsDate` / `untilAsDate` also appear on that object. They are not
 * exposed: they are the same two bounds in a second format, with no
 * documentation of which wins if both are sent.
 */
interface Input {
  since?: string;
  until?: string;
  contactId?: string;
  limit?: number;
  offset?: number;
}

const appointmentList: ActionDefinition<Input> = {
  key: "appointment-list",
  type: "search",
  title: "List Appointments",
  resource: "appointment",
  description:
    "List appointments in a date window, optionally for one contact. Uses Keap's v1 API — v2 " +
    "has no appointment endpoints at all.",
  params: [
    {
      key: "since",
      label: "Starting on or after",
      type: "datetime",
      hint: "ISO-8601, e.g. 2026-01-15T09:00:00.000Z.",
    },
    { key: "until", label: "Starting before", type: "datetime" },
    { key: "contactId", label: "Contact ID", type: "string" },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      validation: { integer: true, min: 1 },
      hint: "v1 pages by limit and offset, not by cursor.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 0 },
      hint: "Records to skip. Feed the `nextOffset` output back in to page.",
    },
  ],
  output: [
    { key: "appointments", type: "array", label: "Appointments" },
    { key: "count", type: "number", label: "Total matching (Keap's own count)" },
    { key: "nextOffset", type: "number", label: "Offset of the next page" },
  ],

  async execute(input, ctx) {
    const client = new KeapClient(ctx);
    const body = await client.json<
      { appointments?: unknown[]; count?: number; next?: string; previous?: string }
    >(`${V1}/appointments`, {
      query: {
        since: input.since,
        until: input.until,
        contact_id: input.contactId,
        limit: input.limit,
        offset: input.offset,
      },
    });
    return {
      appointments: body?.appointments ?? [],
      count: body?.count,
      // Read back out of v1's absolute `next` URL — see the module doc.
      nextOffset: offsetOf(body?.next),
    };
  },
};

export default appointmentList;
