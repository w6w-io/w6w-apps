import { assertEquals } from "@std/assert";
import workspaceGet from "../../actions/workspace-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workspace-get: GETs /workspaces/current with no params", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "w1", name: "Acme" } }]);
  const out = await workspaceGet.execute({}, ctx) as { name: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/workspaces/current");
  assertEquals(out.name, "Acme");
});
