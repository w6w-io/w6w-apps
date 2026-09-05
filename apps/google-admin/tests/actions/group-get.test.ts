import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/group-get.ts";

Deno.test("group-get: GETs /groups/{groupKey}", async () => {
  const body = { id: "g-1", email: "team@example.com" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ groupKey: "team@example.com" }, ctx);

  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/directory/v1/groups/team%40example.com");
  assertEquals(result, body);
});
