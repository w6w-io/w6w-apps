import type { ActionDefinition } from "@w6w/types";
import { compact, SendblueClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  offset?: number;
  updatedAtGte?: string;
}

/**
 * `GET /api/v2/verify/verifications` — account-scoped verification state,
 * documented as the way to recover terminal Verify events after an SSE gap
 * (this app does not implement the `/api/v2/events` stream itself — see the
 * app README — so this list is the practical way to reconcile state).
 */
const verifyVerificationList: ActionDefinition<Input> = {
  key: "verify-verification-list",
  type: "search",
  resource: "verification",
  title: "List Verifications",
  description: "Account-scoped verification state, for recovering terminal Verify events.",
  params: [
    { key: "limit", label: "Limit", type: "number" },
    { key: "offset", label: "Offset", type: "number" },
    { key: "updatedAtGte", label: "Updated at or after (ISO 8601)", type: "string" },
  ],
  output: [
    { key: "data", type: "array", label: "Verifications" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.get(
      "/api/v2/verify/verifications",
      compact({
        limit: input.limit,
        offset: input.offset,
        updated_at_gte: input.updatedAtGte,
      }),
    );
  },
};

export default verifyVerificationList;
