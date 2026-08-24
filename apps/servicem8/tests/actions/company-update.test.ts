import { assertEquals } from "@std/assert";
import companyUpdate from "../../actions/company-update.ts";
import { bodyOf, mockCtx, pathOf, result } from "../_helpers.ts";

Deno.test("company-update: POSTs only the fields that were set", async () => {
  const { ctx, calls } = mockCtx([{ body: result() }]);
  await companyUpdate.execute({ companyUuid: "c1", website: "https://acme.example" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api_1.0/company/c1.json");
  assertEquals(bodyOf(calls[0]), { website: "https://acme.example" });
});

Deno.test("company-update: is marked idempotent", () => {
  assertEquals(companyUpdate.idempotent, true);
});
