import { assertEquals } from "@std/assert";
import organizationsSearch from "../../actions/organizations-search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("organizations-search: calls GET /organizations?term=", async () => {
  const { ctx, calls } = mockCtx([{ body: { organizations: [], next_page_token: null } }]);
  await organizationsSearch.execute({ term: "affinity" }, ctx);
  assertEquals(pathOf(calls[0].url), "/organizations");
  assertEquals(queryOf(calls[0].url).term, "affinity");
});
