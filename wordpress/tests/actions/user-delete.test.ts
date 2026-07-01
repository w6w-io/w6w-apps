import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-delete.ts";

const display = { siteUrl: "https://example.com" };

Deno.test("user-delete: DELETEs /users/me with reassign and force=true", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute!({ reassign: "1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.pathname, "/wp-json/wp/v2/users/me");
  assertEquals(url.searchParams.get("reassign"), "1");
  // WordPress requires force=true when deleting users — the API has no trash for users.
  assertEquals(url.searchParams.get("force"), "true");
});
