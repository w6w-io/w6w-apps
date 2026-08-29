import { assertEquals } from "@std/assert";
import { envelope, mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";
import action from "../../actions/lead-list.ts";

Deno.test("lead-list: GETs /leads with the identity/status filters", async () => {
  const body = envelope({ leads: [] }, { total: 0 });
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ email: "a@b.com", leadsListId: 1, limit: 50 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/leads");
  const q = queryOf(calls[0].url);
  assertEquals(q.email, "a@b.com");
  assertEquals(q.leads_list_id, "1");
  assertEquals(q.limit, "50");
  assertEquals(result, body);
});

Deno.test("lead-list: verificationStatus is sent as a bracket-array, not a comma list", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ leads: [] }) }]);
  await action.execute!({ verificationStatus: ["valid", "unknown"] }, ctx);
  assertEquals(queryAllOf(calls[0].url, "verification_status[]"), ["valid", "unknown"]);
  assertEquals("verification_status" in queryOf(calls[0].url), false);
});
