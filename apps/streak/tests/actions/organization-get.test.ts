import { assertEquals } from "@std/assert";
import organizationGet from "../../actions/organization-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("organization-get: calls GET /organizations/{organizationKey}", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "Kittens r Us" } }]);
  await organizationGet.execute({ organizationKey: "o1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/organizations/o1");
});
