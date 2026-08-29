import { assertEquals } from "@std/assert";
import accountList from "../../actions/account-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("account-list: GETs /accounts with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [{ email: "a@b.com" }] } }]);
  const out = await accountList.execute(
    { status: 1, provider_code: 2, limit: 10 },
    ctx,
  ) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v2/accounts");
  assertEquals(queryOf(calls[0].url), { status: "1", provider_code: "2", limit: "10" });
  assertEquals(out.items.length, 1);
});
