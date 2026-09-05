import type { ActionDefinition } from "@w6w/types";
import { GotoWebinarClient, resolveOrganizerKey } from "../lib/client.ts";

/**
 * `GET /organizers/{organizerKey}/webinars` — the organizer's webinars in a date range.
 *
 * **`fromTime`/`toTime` are REQUIRED**, not optional filters — the collection marks both
 * "(Required)" and a live call omitting either answers `400`, not an unbounded list. There is
 * no "list every webinar" call in this API; a workflow author must pick a window.
 *
 * Page size is `size` here (offset-paged, zero-indexed `page`) — NOT `limit`, which is what
 * the sibling `registrant-list` action's endpoint uses for the identical concept. See
 * `lib/client.ts`'s module doc.
 */
interface Input {
  organizerKey?: string;
  fromTime: string;
  toTime: string;
  page?: number;
  size?: number;
}

const webinarList: ActionDefinition<Input> = {
  key: "webinar-list",
  type: "search",
  resource: "webinar",
  title: "List Webinars",
  description: "List the organizer's webinars within a required date range.",
  params: [
    {
      key: "organizerKey",
      label: "Organizer key",
      type: "string",
      hint: "Defaults to the key captured when this connection was made.",
    },
    {
      key: "fromTime",
      label: "From",
      type: "datetime",
      required: true,
      hint: "ISO-8601 UTC. Required by GoTo — there is no unbounded list.",
    },
    { key: "toTime", label: "To", type: "datetime", required: true, hint: "ISO-8601 UTC." },
    { key: "page", label: "Page", type: "number", default: 0, hint: "Zero-indexed." },
    { key: "size", label: "Page size", type: "number" },
  ],
  output: [
    { key: "webinars", type: "array", label: "Webinars" },
  ],

  async execute(input, ctx) {
    const organizerKey = resolveOrganizerKey(ctx.connection, input.organizerKey);
    const body = await new GotoWebinarClient(ctx).request<
      { _embedded?: { webinars?: unknown[] } }
    >(`/organizers/${organizerKey}/webinars`, {
      query: {
        fromTime: input.fromTime,
        toTime: input.toTime,
        page: input.page,
        size: input.size,
      },
    });
    return { webinars: body?._embedded?.webinars ?? [] };
  },
};

export default webinarList;
