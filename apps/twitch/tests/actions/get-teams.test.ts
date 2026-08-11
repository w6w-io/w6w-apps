import { assertEquals, assertRejects } from "@std/assert";
import getTeams from "../../actions/get-teams.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-teams: calls GET /helix/teams by name", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ id: "6358", team_name: "livecoders", users: [{ user_id: "1" }] }] },
  }]);
  const out = await getTeams.execute({ name: "livecoders" }, ctx) as {
    data: Array<{ users: unknown[] }>;
  };

  assertEquals(pathOf(calls[0].url), "/helix/teams");
  assertEquals(queryOf(calls[0].url), { name: "livecoders" });
  assertEquals(out.data[0].users.length, 1);
});

Deno.test("get-teams: name and ID are mutually exclusive, and neither is refused locally", async () => {
  const both = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(getTeams.execute({ name: "x", id: "1" }, both.ctx)),
    Error,
    "not both",
  );
  assertEquals(both.calls.length, 0);

  const neither = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(getTeams.execute({}, neither.ctx)),
    Error,
    "either a team name or a team ID",
  );
  assertEquals(neither.calls.length, 0);
});
