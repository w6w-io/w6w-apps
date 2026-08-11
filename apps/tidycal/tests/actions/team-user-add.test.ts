import { assertEquals, assertRejects } from "@std/assert";
import teamUserAdd from "../../actions/team-user-add.ts";
import { bodyOf, errorBody, mockCtx, pathOf } from "../_helpers.ts";

/** The response is neither an envelope nor an entity: `{message, team_user_id}`. */
Deno.test("team-user-add: POSTs to /api/teams/{id}/users and returns the membership id", async () => {
  const { ctx, calls } = mockCtx([{
    body: { message: "Invitation sent successfully", team_user_id: 123 },
  }]);
  const out = await teamUserAdd.execute(
    { team: 4, email: "new@example.com", role_name: "user" },
    ctx,
  ) as { team_user_id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/teams/4/users");
  assertEquals(bodyOf(calls[0]), { email: "new@example.com", role_name: "user" });
  assertEquals(out.team_user_id, 123);
});

Deno.test("team-user-add: an omitted role is not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok" } }]);
  await teamUserAdd.execute({ team: 4, email: "new@example.com" }, ctx);
  assertEquals(bodyOf(calls[0]), { email: "new@example.com" });
});

/**
 * Why it is `idempotent: false`: a retry after a lost response does not
 * converge, it 422s — reporting failure for an invitation that was in fact sent.
 */
Deno.test("team-user-add: re-inviting surfaces TidyCal's 422", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("User already invited") }]);
  const err = await assertRejects(
    () => Promise.resolve(teamUserAdd.execute({ team: 4, email: "new@example.com" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("already invited"), true, err.message);
  assertEquals(teamUserAdd.idempotent, false);
});
