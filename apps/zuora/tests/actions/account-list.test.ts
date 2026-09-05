import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, page } from "./_shared.ts";
import action from "../../actions/account-list.ts";

Deno.test("account-list: lists accounts via Object Query", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "acc1", name: "Acme" }])], { display });
  const result = await action.execute!({}, ctx) as { count: number; accounts: unknown[] };
  assertEquals(calls[0].url.split("?")[0], "https://rest.zuora.com/object-query/accounts");
  assertEquals(result.count, 1);
  assertEquals(result.accounts.length, 1);
});

Deno.test("account-list: sends filter clauses as repeated filter[] params", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ filter: "currency.EQ:USD,status.EQ:Active" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("filter[]"), ["currency.EQ:USD", "status.EQ:Active"]);
});

Deno.test("account-list: defaults to a 20-row page when returnAll is false", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("pageSize"), "20");
});

Deno.test("account-list: pages to the end when returnAll is true", async () => {
  const { ctx, calls } = mockCtx(
    [page([{ id: "a" }], "cursor-1"), page([{ id: "b" }], null)],
    { display },
  );
  const result = await action.execute!({ returnAll: true }, ctx) as { count: number };
  assertEquals(calls.length, 2);
  assertEquals(new URL(calls[1].url).searchParams.get("cursor"), "cursor-1");
  assertEquals(result.count, 2);
});
