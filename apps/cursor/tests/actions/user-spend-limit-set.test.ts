import { assertEquals } from "@std/assert";
import userSpendLimitSet from "../../actions/user-spend-limit-set.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-spend-limit-set: sets a limit", async () => {
  const { ctx, calls } = mockCtx([
    { body: { outcome: "success", message: "Spend limit set to $100 for user a@co.com" } },
  ]);
  const out = await userSpendLimitSet.execute(
    { userEmail: "a@co.com", spendLimitDollars: 100 },
    ctx,
  ) as { outcome: string };
  assertEquals(pathOf(calls[0].url), "/teams/user-spend-limit");
  assertEquals(JSON.parse(calls[0].body!), { userEmail: "a@co.com", spendLimitDollars: 100 });
  assertEquals(out.outcome, "success");
});

Deno.test("user-spend-limit-set: an unset limit is sent as null (removes it)", async () => {
  const { ctx, calls } = mockCtx([{ body: { outcome: "success", message: "cleared" } }]);
  await userSpendLimitSet.execute({
    userEmail: "a@co.com",
    spendLimitDollars: null as unknown as number,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { userEmail: "a@co.com", spendLimitDollars: null });
});

Deno.test("user-spend-limit-set: a zero limit is preserved, not treated as unset", async () => {
  const { ctx, calls } = mockCtx([{ body: { outcome: "success", message: "set to $0" } }]);
  await userSpendLimitSet.execute({ userEmail: "a@co.com", spendLimitDollars: 0 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).spendLimitDollars, 0);
});
