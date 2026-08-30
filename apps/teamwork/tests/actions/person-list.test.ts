import { assertEquals } from "@std/assert";
import { mockTeamworkCtx } from "../_helpers.ts";
import action from "../../actions/person-list.ts";

Deno.test("person-list: GETs /projects/api/v3/people.json with filters", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ body: { people: [] } }]);
  await action.execute({ searchTerm: "jo", projectIds: "1,2" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/projects/api/v3/people.json");
  assertEquals(url.searchParams.get("searchTerm"), "jo");
  assertEquals(url.searchParams.get("projectIds"), "1,2");
});
