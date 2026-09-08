import { assertEquals } from "@std/assert";
import sessionList from "../../actions/session-list.ts";
import { list, mockCtx, pathOf, queryOf, resource } from "../_helpers.ts";

Deno.test("session-list: lists all sessions, filtered", async () => {
  const { ctx, calls } = mockCtx([{ body: list([resource("sessions", "s1")]) }]);
  await sessionList.execute({ status: "upcoming", dateFrom: "2026-01-01" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/sessions");
  assertEquals(queryOf(calls[0].url), {
    "filter[status]": "upcoming",
    "filter[date_from]": "2026-01-01",
  });
});
