import { assertEquals } from "@std/assert";
import accountDelete from "../../actions/account-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-delete: DELETEs /accounts/{email}", async () => {
  const { ctx, calls } = mockCtx([{ body: { email: "a@b.com" } }]);
  const out = await accountDelete.execute({ email: "a@b.com" }, ctx) as { email: string };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/accounts/a%40b.com");
  assertEquals(out.email, "a@b.com");
});
