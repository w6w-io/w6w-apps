import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/member-delete.ts";

Deno.test("member-delete: DELETEs /groups/{groupKey}/members/{memberKey}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({
    groupKey: "team@example.com",
    memberKey: "person@example.com",
  }, ctx);

  assertEquals(calls[0].method, "DELETE");
  const url = new URL(calls[0].url);
  assertEquals(
    url.pathname,
    "/admin/directory/v1/groups/team%40example.com/members/person%40example.com",
  );
  assertEquals(result, {
    groupKey: "team@example.com",
    memberKey: "person@example.com",
    success: true,
  });
});
