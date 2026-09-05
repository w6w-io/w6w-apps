import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/member-list.ts";

Deno.test("member-list: GETs /groups/{groupKey}/members", async () => {
  const body = { members: [] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ groupKey: "team@example.com" }, ctx);

  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/directory/v1/groups/team%40example.com/members");
  assertEquals(url.searchParams.get("maxResults"), "200");
  assertEquals(result, body);
});

Deno.test("member-list: forwards roles and includeDerivedMembership", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    groupKey: "team@example.com",
    roles: "OWNER,MANAGER",
    includeDerivedMembership: true,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("roles"), "OWNER,MANAGER");
  assertEquals(url.searchParams.get("includeDerivedMembership"), "true");
});
