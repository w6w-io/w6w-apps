import { assertEquals } from "@std/assert";
import organizationsGet from "../../actions/organizations-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("organizations-get: calls GET /organizations/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 64779194, name: "Affinity" } }]);
  const out = await organizationsGet.execute({ organizationId: 64779194 }, ctx) as { name: string };
  assertEquals(pathOf(calls[0].url), "/organizations/64779194");
  assertEquals(out.name, "Affinity");
});
