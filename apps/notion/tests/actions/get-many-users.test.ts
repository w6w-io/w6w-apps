import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-many-users.ts";

Deno.test("get-many-users: GETs /users with defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "list", results: [], next_cursor: null, has_more: false } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/users");
  assertEquals(url.searchParams.get("page_size"), "100");
});
