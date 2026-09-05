import { assertEquals } from "@std/assert";
import leadChangeStatus from "../../actions/lead-change-status.ts";
import { leadChangeStatusOptions } from "../../lib/params.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-change-status: PUTs to /leads/{leadId}/status, leadId excluded from the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok" } }]);
  await leadChangeStatus.execute({ leadId: 5, status: 3, lossReasonId: 12 }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/api/leads/5/status");
  assertEquals(JSON.parse(calls[0].body!), { status: 3, lossReasonId: 12 });
});

/**
 * The vendor's change-status enum is {0,2,3,5} — narrower than the six
 * `Lead.status` values. This pins that the param options do not silently grow
 * to include 1 (Quoted) or 4 (Contacted), which the API rejects here.
 */
Deno.test("lead-change-status: only offers the vendor's own change-status enum", () => {
  const values = leadChangeStatusOptions.map((o) => o.value).sort((a, b) => a - b);
  assertEquals(values, [0, 2, 3, 5]);
});
