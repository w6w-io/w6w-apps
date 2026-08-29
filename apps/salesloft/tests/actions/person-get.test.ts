import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/person-get.ts";

Deno.test("person-get: GETs /people/:id", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 42, first_name: "Ada" } } }]);
  const result = await action.execute!({ id: 42 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/people/42");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { data: { id: 42, first_name: "Ada" } });
});
