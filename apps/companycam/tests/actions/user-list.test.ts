import { assertEquals } from "@std/assert";
import userList from "../../actions/user-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-list: pages users and offers no filters, because the endpoint has none", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "9", status: "deleted" }] }]);
  const page = await userList.execute({ page: 1, perPage: 50 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/users");
  assertEquals(queryOf(calls[0].url), { page: "1", per_page: "50" });
  assertEquals(userList.params!.map((p) => p.key), ["page", "perPage"]);
  // Deleted users come back in the same list; there is no status filter.
  assertEquals((page.items[0] as { status: string }).status, "deleted");
});
