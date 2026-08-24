import { assertEquals } from "@std/assert";
import companyGet from "../../actions/company-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("company-get: calls GET /company/{uuid}.json", async () => {
  const { ctx, calls } = mockCtx([{ body: { uuid: "c1", name: "Acme" } }]);
  const out = await companyGet.execute({ companyUuid: "c1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api_1.0/company/c1.json");
  assertEquals(out, { uuid: "c1", name: "Acme" });
});
