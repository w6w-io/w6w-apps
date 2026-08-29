import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-get.ts";

Deno.test("user-get: GETs /users/:id", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 2, name: "Ada" } } }]);
  const result = await action.execute!({ id: 2 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/users/2");
  assertEquals(result, { data: { id: 2, name: "Ada" } });
});
