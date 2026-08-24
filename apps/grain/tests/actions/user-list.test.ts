import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

Deno.test("user-list: POSTs /v2/users with an empty body and no params", async () => {
  const { ctx, calls } = mockCtx([{ body: { users: [{ id: "u1", name: "Luke Skywalker" }] } }]);
  const result = await action.execute({}, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/_/public-api/v2/users");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, "{}");
  assertEquals(result, { users: [{ id: "u1", name: "Luke Skywalker" }] });
  assertEquals(action.params, []);
});

Deno.test("user-list: defaults to an empty array when Grain omits users", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const result = await action.execute({}, ctx);
  assertEquals(result, { users: [] });
});
