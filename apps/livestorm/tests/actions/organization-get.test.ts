import { assertEquals } from "@std/assert";
import organizationGet from "../../actions/organization-get.ts";
import { mockCtx, pathOf, single } from "../_helpers.ts";

Deno.test("organization-get: calls GET /organization and returns data", async () => {
  const { ctx, calls } = mockCtx([{ body: single("organizations", "org1", { name: "Acme" }) }]);
  const result = await organizationGet.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/organization");
  assertEquals(result, { id: "org1", type: "organizations", attributes: { name: "Acme" } });
});
