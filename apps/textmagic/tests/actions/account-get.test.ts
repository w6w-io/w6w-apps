import { assertEquals } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-get: calls GET /user and returns the body verbatim", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: 305, username: "charles.conway", balance: 208.64, status: "A" } },
  ]);
  const out = await accountGet.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/user");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { id: 305, username: "charles.conway", balance: 208.64, status: "A" });
});

Deno.test("account-get: takes no parameters", () => {
  assertEquals(accountGet.params?.length, 0);
});
