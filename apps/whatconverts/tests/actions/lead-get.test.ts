import { assertEquals } from "@std/assert";
import leadGet from "../../actions/lead-get.ts";
import { API_ROOT, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("lead-get fetches by id with no customer_journey by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { lead_id: 148099 } }]);
  const out = await leadGet.execute({ leadId: 148099 }, ctx);
  assertEquals(out, { lead_id: 148099 });
  assertEquals(calls[0].url, `${API_ROOT}/leads/148099`);
});

Deno.test("lead-get passes customer_journey=true through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { lead_id: 1 } }]);
  await leadGet.execute({ leadId: 1, customerJourney: true }, ctx);
  assertEquals(queryOf(calls[0].url), { customer_journey: "true" });
});
