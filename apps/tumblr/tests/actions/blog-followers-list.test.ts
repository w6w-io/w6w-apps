import { assertEquals } from "@std/assert";
import blogFollowersList from "../../actions/blog-followers-list.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("blog-followers-list: calls GET /v2/blog/{id}/followers and returns the users envelope", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ total_users: 2, users: [{ name: "david" }, { name: "ben" }] }) },
  ]);
  const out = await blogFollowersList.execute({ blogIdentifier: "staff.tumblr.com" }, ctx) as {
    total_users: number;
    users: Array<{ name: string }>;
  };

  assertEquals(pathOf(calls[0].url), "/v2/blog/staff.tumblr.com/followers");
  assertEquals(out.total_users, 2);
  assertEquals(out.users[0].name, "david");
});
