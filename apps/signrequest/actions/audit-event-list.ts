import type { ActionDefinition } from "@w6w/types";
import { compact, SignRequestClient } from "../lib/client.ts";
import { limitParam, pageParam } from "../lib/params.ts";

interface Input {
  userEmail?: string;
  eventType?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * `GET /audit-events/` — login/security audit log (`user_email`, `user_ip`, `event_type`,
 * `status`, `timestamp`), separate from the document/signer `Event` log `event-list` reads.
 */
const auditEventList: ActionDefinition<Input> = {
  key: "audit-event-list",
  type: "read",
  resource: "audit-event",
  title: "List Audit Events",
  description: "List the team's login/security audit log.",
  params: [
    { key: "userEmail", label: "User Email", type: "string" },
    { key: "eventType", label: "Event Type", type: "string" },
    { key: "status", label: "Status", type: "string" },
    pageParam,
    limitParam,
  ],
  output: [
    { key: "count", type: "number", label: "Total result count" },
    { key: "next", type: "string", label: "Next page URL" },
    { key: "previous", type: "string", label: "Previous page URL" },
    { key: "results", type: "array", label: "Audit events" },
  ],

  execute(input, ctx) {
    return new SignRequestClient(ctx).request("/audit-events/", {
      query: compact({
        user_email: input.userEmail,
        event_type: input.eventType,
        status: input.status,
        page: input.page,
        limit: input.limit,
      }),
    });
  },
};

export default auditEventList;
