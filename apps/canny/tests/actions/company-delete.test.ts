import { assertEquals } from "@std/assert";
import companyDelete from "../../actions/company-delete.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("company-delete: posts companyID, unwraps the confirmation", async () => {
  const { ctx, calls } = mockCtx([{ body: '"success"' }]);
  const out = await companyDelete.execute({ companyID: "co1" }, ctx) as { message: string };

  assertEquals(calls[0].url, "https://canny.io/api/v1/companies/delete");
  assertEquals(bodyOf(calls[0]), { companyID: "co1" });
  assertEquals(out.message, "success");
});
