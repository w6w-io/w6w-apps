import { assertEquals } from "@std/assert";
import userRemoveFromCompany from "../../actions/user-remove-from-company.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("user-remove-from-company: posts id and companyID, unwraps the confirmation", async () => {
  const { ctx, calls } = mockCtx([{ body: '"success"' }]);
  const out = await userRemoveFromCompany.execute({ id: "u1", companyID: "co1" }, ctx) as {
    message: string;
  };

  assertEquals(calls[0].url, "https://canny.io/api/v1/users/remove_user_from_company");
  assertEquals(bodyOf(calls[0]), { id: "u1", companyID: "co1" });
  assertEquals(out.message, "success");
});
