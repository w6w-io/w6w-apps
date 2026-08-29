import { assertEquals } from "@std/assert";
import organizationGet from "../../actions/organization-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("organization-get: GETs /organizations/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { organization: { id: "o1", name: "Apollo" } } }]);
  const out = await organizationGet.execute({ id: "o1" }, ctx) as {
    organization: { name: string };
  };
  assertEquals(pathOf(calls[0].url), "/api/v1/organizations/o1");
  assertEquals(out.organization.name, "Apollo");
});
