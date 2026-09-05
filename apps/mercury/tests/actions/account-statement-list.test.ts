import { assertEquals } from "@std/assert";
import accountStatementList from "../../actions/account-statement-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("account-statement-list: GETs /account/{accountId}/statements", async () => {
  const { ctx, calls } = mockCtx([{ body: { statements: [{ id: "st_1" }], page: {} } }]);
  const out = await accountStatementList.execute({ accountId: "acc_1" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(pathOf(calls[0].url), "/api/v1/account/acc_1/statements");
  assertEquals((out.items as unknown[]).length, 1);
});

Deno.test("account-statement-list: forwards the start/end date-range filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { statements: [], page: {} } }]);
  await accountStatementList.execute(
    { accountId: "acc_1", start: "2026-01-01", end: "2026-06-30" },
    ctx,
  );
  assertEquals(queryOf(calls[0].url).start, "2026-01-01");
  assertEquals(queryOf(calls[0].url).end, "2026-06-30");
});
