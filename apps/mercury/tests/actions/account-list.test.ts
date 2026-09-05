import { assertEquals } from "@std/assert";
import accountList from "../../actions/account-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("account-list: GETs /accounts with pagination params, defaults limit and order", async () => {
  const { ctx, calls } = mockCtx([
    { body: { accounts: [{ id: "acc_1" }], page: { nextPage: "acc_2" } } },
  ]);
  const out = await accountList.execute({ limit: 1000, order: "asc" }, ctx) as {
    items: unknown[];
    nextPage?: string;
  };
  assertEquals(pathOf(calls[0].url), "/api/v1/accounts");
  assertEquals(queryOf(calls[0].url), { limit: "1000", order: "asc" });
  assertEquals(out.items.length, 1);
  assertEquals(out.nextPage, "acc_2");
});

Deno.test("account-list: an empty accounts key returns an empty array, not undefined", async () => {
  const { ctx } = mockCtx([{ body: { page: {} } }]);
  const out = await accountList.execute({}, ctx) as { items: unknown[] };
  assertEquals(out.items, []);
});

Deno.test("account-list: forwards cursor params under their snake_case wire names", async () => {
  const { ctx, calls } = mockCtx([{ body: { accounts: [], page: {} } }]);
  await accountList.execute({ startAfter: "acc_1", endBefore: "acc_9" }, ctx);
  assertEquals(queryOf(calls[0].url).start_after, "acc_1");
  assertEquals(queryOf(calls[0].url).end_before, "acc_9");
});
