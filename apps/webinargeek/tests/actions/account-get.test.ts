import { assertEquals } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-get: hits GET /account and returns company/email verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { company: "My company", email: "my@email.com" } }]);
  const out = await accountGet.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/account");
  assertEquals(out, { company: "My company", email: "my@email.com" });
});
