import { assertEquals } from "@std/assert";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/lead-get.ts";

Deno.test("lead-get: GETs /leads/{id}", async () => {
  const body = envelope({ id: 1, email: "hoon@stripe.com" });
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ id: 1 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/leads/1");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
