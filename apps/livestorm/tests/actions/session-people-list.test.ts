import { assertEquals } from "@std/assert";
import sessionPeopleList from "../../actions/session-people-list.ts";
import { list, mockCtx, pathOf, queryOf, resource } from "../_helpers.ts";

Deno.test("session-people-list: GETs /sessions/{id}/people (the period_id path) with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: list([resource("people", "p1")]) }]);
  await sessionPeopleList.execute({ id: "s1", attended: true, role: "participant" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/sessions/s1/people");
  assertEquals(queryOf(calls[0].url), {
    "filter[attended]": "true",
    "filter[role]": "participant",
  });
});
