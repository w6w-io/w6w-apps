import { assertEquals } from "@std/assert";
import userSearch from "../../actions/user-search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-search: GETs /user/search with the query as `username`", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ name: "jdoe", displayName: "Jane Doe" }] }]);
  await userSearch.execute({ username: "jane", includeActive: true, includeInactive: false }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/rest/api/2/user/search");
  assertEquals(
    queryOf(calls[0].url),
    { username: "jane", includeActive: "true", includeInactive: "false" },
  );
});
