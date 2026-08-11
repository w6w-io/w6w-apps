import { assertEquals } from "@std/assert";
import teamUserAdd from "../../actions/team-user-add.ts";
import { entityBody, mockCtx, pathOf } from "../_helpers.ts";

/** Membership lives entirely in the path — there is no request body. */
Deno.test("team-user-add: POSTs /v1/teams/{team}/users/{user} with no body", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: entityBody("team", { id: 679, users: [{ id: 456 }] }) },
  ]);
  const out = await teamUserAdd.execute({ teamId: "679", userId: "456" }, ctx) as {
    users: unknown[];
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/teams/679/users/456");
  assertEquals(calls[0].body, null);
  assertEquals(out.users.length, 1);
});
