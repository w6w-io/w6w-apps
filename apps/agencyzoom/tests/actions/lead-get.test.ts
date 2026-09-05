import { assertEquals } from "@std/assert";
import leadGet from "../../actions/lead-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-get: GET /leads/{leadId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42, firstname: "Alex" } }]);
  const result = await leadGet.execute({ leadId: 42 }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/api/leads/42");
  assertEquals(result, { id: 42, firstname: "Alex" });
});
