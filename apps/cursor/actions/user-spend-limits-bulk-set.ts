import type { ActionDefinition } from "@w6w/types";
import { CursorClient } from "../lib/client.ts";

interface SpendLimitUpdate {
  userEmail: string;
  spendLimitDollars: number | null;
}

interface Input {
  updates: SpendLimitUpdate[] | string;
}

interface BulkResult {
  userEmail: string;
  status: "updated" | "unchanged" | "failed";
  error?: string;
}

interface BulkSetResponse {
  requestedCount: number;
  updatedCount: number;
  unchangedCount: number;
  failedCount: number;
  results: BulkResult[];
}

/**
 * `POST /teams/user-spend-limits` (Preview) — set spending limits for up to
 * 100 team members in one request.
 *
 * The doc marks this route itself as preview: "Request shape, response
 * fields, and error behavior can shift before general availability." It is
 * still implemented here rather than left out, because it is fully
 * documented with a worked example — but the description says so, and the
 * two failure modes are worth knowing:
 *
 *  - **Enterprise only.** Teams not yet enabled for the bulk route get a
 *    `403`, not a partial success.
 *  - **A missing team member fails that one entry** (`status: "failed"`)
 *    without blocking the rest of the batch; invalid fields, duplicate
 *    emails, or more than 100 updates fail the WHOLE request with a `400`
 *    and apply nothing. Repeating an already-applied update reports
 *    `"unchanged"` rather than erroring or double-charging an audit log.
 *
 * Rate limited to 20 requests/minute per team.
 */
const userSpendLimitsBulkSet: ActionDefinition<Input> = {
  key: "user-spend-limits-bulk-set",
  type: "perform",
  resource: "spend",
  title: "Set User Spend Limits in Bulk (Preview)",
  description:
    "Set spending limits for up to 100 team members in one request. Preview route: Enterprise " +
    "only, and its shape may change before general availability.",
  idempotent: true,
  params: [
    {
      key: "updates",
      label: "Updates",
      type: "json",
      required: true,
      hint: 'Array of up to 100 { "userEmail": string, "spendLimitDollars": integer | null } ' +
        "objects. null removes the limit for that member.",
    },
  ],
  output: [
    { key: "requestedCount", type: "number", label: "Updates requested" },
    { key: "updatedCount", type: "number", label: "Limits changed" },
    { key: "unchangedCount", type: "number", label: "Already at the requested value" },
    { key: "failedCount", type: "number", label: "Updates Cursor could not apply" },
    { key: "results", type: "array", label: "Per-update result, in request order" },
  ],

  execute(input, ctx) {
    const updates = typeof input.updates === "string" ? JSON.parse(input.updates) : input.updates;
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error("updates must be a non-empty array");
    }
    if (updates.length > 100) throw new Error("updates cannot exceed 100 entries per request");

    return new CursorClient(ctx).post<BulkSetResponse>("/teams/user-spend-limits", { updates });
  },
};

export default userSpendLimitsBulkSet;
