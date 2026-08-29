import { assertEquals } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-get: GETs /accounts/{email}", async () => {
  const { ctx, calls } = mockCtx([{ body: { email: "a@b.com", status: 1 } }]);
  const out = await accountGet.execute({ email: "a@b.com" }, ctx) as { email: string };

  assertEquals(pathOf(calls[0].url), "/api/v2/accounts/a%40b.com");
  assertEquals(out.email, "a@b.com");
});
