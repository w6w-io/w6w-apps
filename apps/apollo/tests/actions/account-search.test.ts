import { assertEquals } from "@std/assert";
import accountSearch from "../../actions/account-search.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-search: POSTs a JSON body (unlike the database org search)", async () => {
  const { ctx, calls } = mockCtx([
    { body: { accounts: [{ id: "a1" }], pagination: { total_entries: 1 } } },
  ]);
  const out = await accountSearch.execute(
    { q_organization_name: "Acme", account_stage_ids: "s1,s2" },
    ctx,
  ) as { accounts: unknown[] };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/accounts/search");
  assertEquals(JSON.parse(calls[0].body!), {
    q_organization_name: "Acme",
    account_stage_ids: ["s1", "s2"],
  });
  assertEquals(out.accounts.length, 1);
});
