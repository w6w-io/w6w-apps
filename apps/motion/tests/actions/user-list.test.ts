import { assertEquals } from "@std/assert";
import userList from "../../actions/user-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-list: calls GET /v1/users and unwraps the `users` key", async () => {
  const { ctx, calls } = mockCtx([
    { body: page("users", [{ id: "u1", name: "Ada", email: "ada@example.com" }]) },
  ]);
  const out = await userList.execute({ workspaceId: "ws1", teamId: "tm1", cursor: "c1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/users");
  assertEquals(queryOf(calls[0].url), { workspaceId: "ws1", teamId: "tm1", cursor: "c1" });
  assertEquals(out, {
    items: [{ id: "u1", name: "Ada", email: "ada@example.com" }],
    meta: { pageSize: 1 },
  });
});

Deno.test("user-list: both narrowing filters are optional", async () => {
  const { ctx, calls } = mockCtx([{ body: page("users", []) }]);
  await userList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
