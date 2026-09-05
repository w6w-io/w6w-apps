import { assertEquals } from "@std/assert";
import organizationGet from "../../actions/organization-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("organization-get: GETs /organization and unwraps the organization key", async () => {
  const { ctx, calls } = mockCtx([{ body: { organization: { legalBusinessName: "Acme Inc" } } }]);
  const out = await organizationGet.execute({}, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v1/organization");
  assertEquals((out.organization as { legalBusinessName: string }).legalBusinessName, "Acme Inc");
});
