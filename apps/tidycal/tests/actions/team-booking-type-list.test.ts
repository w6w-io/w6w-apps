import { assertEquals } from "@std/assert";
import teamBookingTypeList from "../../actions/team-booking-type-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("team-booking-type-list: calls GET /api/teams/{id}/booking-types", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: 8 }]) }]);
  const out = await teamBookingTypeList.execute({ team: 4, page: 3 }, ctx) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/teams/4/booking-types");
  assertEquals(queryOf(calls[0].url), { page: "3" });
  assertEquals(out.data.length, 1);
});
