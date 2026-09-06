import { assertEquals } from "@std/assert";
import peopleList from "../../actions/people-list.ts";
import { list, mockCtx, pathOf, queryOf, resource } from "../_helpers.ts";

Deno.test("people-list: GETs /people with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: list([resource("people", "p1")]) }]);
  await peopleList.execute({ role: "team_member" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/people");
  assertEquals(queryOf(calls[0].url), { "filter[role]": "team_member" });
});
