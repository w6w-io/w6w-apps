import { assertEquals } from "@std/assert";
import listInvitations from "../../actions/list-invitations.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-invitations: GET /invitations, wrapped under `invitations`", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "i1", code: "AB12CD" }] }]);
  const out = await listInvitations.execute({}, ctx) as { invitations: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v0/invitations");
  assertEquals(out.invitations.length, 1);
});
