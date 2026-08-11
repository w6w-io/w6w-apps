import { assertEquals } from "@std/assert";
import teamBookingTypeCreate from "../../actions/team-booking-type-create.ts";
import bookingTypeCreate from "../../actions/booking-type-create.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

const REQUIRED = {
  title: "Team intro",
  description: "Meet the team",
  duration_minutes: 45,
  url_slug: "team-intro",
};

Deno.test("team-booking-type-create: POSTs to /api/teams/{id}/booking-types", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: 11 }) }]);
  const out = await teamBookingTypeCreate.execute({ team: 4, ...REQUIRED }, ctx) as {
    data: { id: number };
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/teams/4/booking-types");
  assertEquals(out.data.id, 11);
});

/** The team id addresses the resource; it must not leak into the body. */
Deno.test("team-booking-type-create: the team id stays in the path", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({}) }]);
  await teamBookingTypeCreate.execute({ team: 4, ...REQUIRED }, ctx);
  assertEquals(bodyOf(calls[0]), REQUIRED);
  assertEquals(bodyOf(calls[0]).team, undefined, "the team id was posted as a body field");
});

/**
 * TidyCal declares byte-identical request schemas for the personal and team
 * creates, which is why both actions share one param fragment. If they ever
 * diverge, this is where it shows up rather than in a 422 at runtime.
 */
Deno.test("team-booking-type-create: shares the personal create's body fields exactly", () => {
  const personal = (bookingTypeCreate.params ?? []).map((p) => p.key);
  const team = (teamBookingTypeCreate.params ?? []).map((p) => p.key);
  assertEquals(team[0], "team", "the team id is not the first param");
  assertEquals(team.slice(1), personal);
});
