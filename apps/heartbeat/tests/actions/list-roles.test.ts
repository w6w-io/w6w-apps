import { assertEquals } from "@std/assert";
import listRoles from "../../actions/list-roles.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-roles: GET /roles, wrapped under `roles`", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "r1", name: "Moderator" }] }]);
  const out = await listRoles.execute({}, ctx) as { roles: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v0/roles");
  assertEquals(out.roles, [{ id: "r1", name: "Moderator" }]);
});
