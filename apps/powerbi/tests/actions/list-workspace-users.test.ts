import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-workspace-users.ts";

Deno.test("list-workspace-users: GETs /groups/{id}/users", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ identifier: "a@b.com" }] } }]);
  const out = await action.execute({ groupId: "w1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/groups/w1/users");
  assertEquals(out.value.length, 1);
});

Deno.test("list-workspace-users: Max results/Skip ride as $top/$skip", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ groupId: "w1", top: 10, skip: 5 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("$top"), "10");
  assertEquals(url.searchParams.get("$skip"), "5");
});
