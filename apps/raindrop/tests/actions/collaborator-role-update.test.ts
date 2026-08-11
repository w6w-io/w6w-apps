import { assert, assertEquals } from "@std/assert";
import collaboratorRoleUpdate from "../../actions/collaborator-role-update.ts";
import { bodyOf, mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("collaborator-role-update: PUTs /collection/{id}/sharing/{userId}", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody() }]);
  const out = await collaboratorRoleUpdate.execute(
    { id: 8492393, userId: 373381, role: "member" },
    ctx,
  ) as { result: boolean };

  assertEquals(pathOf(calls[0].url), "/rest/v1/collection/8492393/sharing/373381");
  assertEquals(calls[0].method, "PUT");
  assertEquals(bodyOf(calls[0]), { role: "member" });
  assertEquals(out.result, true);
});

/** The path segment is a user id, not an email — the confusion is easy to make. */
Deno.test("collaborator-role-update: the hint says the id is not an email", () => {
  const hint = collaboratorRoleUpdate.params?.find((p) => p.key === "userId")?.hint ?? "";
  assert(/not an email/i.test(hint), hint);
});

Deno.test("collaborator-role-update: is idempotent", () => {
  assertEquals(collaboratorRoleUpdate.idempotent, true);
});
