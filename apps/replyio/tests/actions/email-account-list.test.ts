import { assertEquals } from "@std/assert";
import emailAccountList from "../../actions/email-account-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("email-account-list: GETs /v3/email-accounts, my defaults to unset (= everyone visible)", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1, email: "a@b.com" }]) }]);
  const out = await emailAccountList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/email-accounts");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out, { items: [{ id: 1, email: "a@b.com" }], hasMore: false });
});

Deno.test("email-account-list: my=true is passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await emailAccountList.execute({ my: true }, ctx);
  assertEquals(queryOf(calls[0].url), { my: "true" });
});
