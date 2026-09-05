import type { ActionDefinition } from "@w6w/types";
import { GotoWebinarClient, resolveOrganizerKey } from "../lib/client.ts";

/**
 * `GET /organizers/{organizerKey}/webinars/{webinarKey}/sessions` — a webinar's individual
 * sessions (a series or sequence webinar has more than one).
 *
 * Wrapped under `_embedded.sessionInfoResources` — a third spelling of the HAL embedded key,
 * alongside `_embedded.webinars` (webinar-list) and the bare-array registrant/panelist lists.
 * Nothing here is uniform across this API's list endpoints.
 */
interface Input {
  organizerKey?: string;
  webinarKey: string;
  page?: number;
  size?: number;
}

const sessionList: ActionDefinition<Input> = {
  key: "session-list",
  type: "search",
  resource: "session",
  title: "List Webinar Sessions",
  description: "List a webinar's individual sessions.",
  params: [
    {
      key: "organizerKey",
      label: "Organizer key",
      type: "string",
      hint: "Defaults to the key captured when this connection was made.",
    },
    { key: "webinarKey", label: "Webinar key", type: "string", required: true },
    { key: "page", label: "Page", type: "number", default: 0, hint: "Zero-indexed." },
    { key: "size", label: "Page size", type: "number" },
  ],
  output: [{ key: "sessions", type: "array", label: "Sessions" }],

  async execute(input, ctx) {
    const organizerKey = resolveOrganizerKey(ctx.connection, input.organizerKey);
    const body = await new GotoWebinarClient(ctx).request<
      { _embedded?: { sessionInfoResources?: unknown[] } }
    >(`/organizers/${organizerKey}/webinars/${input.webinarKey}/sessions`, {
      query: { page: input.page, size: input.size },
    });
    return { sessions: body?._embedded?.sessionInfoResources ?? [] };
  },
};

export default sessionList;
