import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/cadence-membership-create.ts";

Deno.test("cadence-membership-create: POSTs /cadence_memberships with query params, no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const result = await action.execute!({ personId: 10, cadenceId: 20, stepId: 3 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/cadence_memberships");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.searchParams.get("person_id"), "10");
  assertEquals(url.searchParams.get("cadence_id"), "20");
  assertEquals(url.searchParams.get("step_id"), "3");
  assertEquals(calls[0].body, null);
  assertEquals(result, { data: { id: 1 } });
});
