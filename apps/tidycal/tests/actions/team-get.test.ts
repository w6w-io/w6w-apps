import { assertEquals, assertRejects } from "@std/assert";
import teamGet from "../../actions/team-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

/** Another bare-entity read: no `data` wrapper. */
Deno.test("team-get: calls GET /api/teams/{id} and returns the bare entity", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 4, name: "Sales Team" } }]);
  const out = await teamGet.execute({ team: 4 }, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/api/teams/4");
  assertEquals(out.name, "Sales Team");
});

/**
 * 403 and 404 mean different things here — removed from the team versus the team
 * is gone — so the status must reach the caller rather than being flattened.
 */
Deno.test("team-get: a 404 is reported as TidyCal sent it", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("Team not found") }]);
  const err = await assertRejects(() => Promise.resolve(teamGet.execute({ team: 4 }, ctx)), Error);
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Team not found"), true, err.message);
});
