import { assertEquals } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-get: calls GET /me and returns companyName/companyId", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ companyName: "Acme", companyId: "co_1" }) }]);
  const out = await accountGet.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/me");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { companyName: "Acme", companyId: "co_1" });
});

Deno.test("account-get: takes no parameters", () => {
  assertEquals(accountGet.params?.length, 0);
});
