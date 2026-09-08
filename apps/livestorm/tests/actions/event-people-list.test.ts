import { assertEquals } from "@std/assert";
import eventPeopleList from "../../actions/event-people-list.ts";
import { list, mockCtx, pathOf, queryOf, resource } from "../_helpers.ts";

Deno.test("event-people-list: lists people for an event with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: list([resource("people", "p1")]) }]);
  await eventPeopleList.execute({ id: "e1", role: "participant", email: "a@b.com" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/events/e1/people");
  assertEquals(queryOf(calls[0].url), {
    "filter[role]": "participant",
    "filter[email]": "a@b.com",
  });
});
