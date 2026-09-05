import type { ActionDefinition } from "@w6w/types";
import { compact, SignRequestClient } from "../lib/client.ts";
import { limitParam, pageParam } from "../lib/params.ts";

interface Input {
  documentUuid?: string;
  eventType?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * `GET /events/` — the same events the callback URL / webhooks deliver, readable directly. Useful
 * for reconciling a callback endpoint under development, or for pulling event history without one.
 */
const eventList: ActionDefinition<Input> = {
  key: "event-list",
  type: "read",
  resource: "event",
  title: "List Events",
  description: "List document/signer events, optionally filtered by document, type, or status.",
  params: [
    { key: "documentUuid", label: "Document ID", type: "string" },
    { key: "eventType", label: "Event Type", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "ok", label: "ok" }, { value: "error", label: "error" }],
    },
    pageParam,
    limitParam,
  ],
  output: [
    { key: "count", type: "number", label: "Total result count" },
    { key: "next", type: "string", label: "Next page URL" },
    { key: "previous", type: "string", label: "Previous page URL" },
    { key: "results", type: "array", label: "Events" },
  ],

  execute(input, ctx) {
    return new SignRequestClient(ctx).request("/events/", {
      query: compact({
        "document__uuid": input.documentUuid,
        event_type: input.eventType,
        status: input.status,
        page: input.page,
        limit: input.limit,
      }),
    });
  },
};

export default eventList;
