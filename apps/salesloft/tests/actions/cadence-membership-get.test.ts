import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/cadence-membership-get.ts";

Deno.test("cadence-membership-get: GETs /cadence_memberships/:id", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 5 } } }]);
  const result = await action.execute!({ id: 5 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/cadence_memberships/5");
  assertEquals(result, { data: { id: 5 } });
});
