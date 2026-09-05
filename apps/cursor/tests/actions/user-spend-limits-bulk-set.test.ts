import { assertEquals, assertRejects } from "@std/assert";
import userSpendLimitsBulkSet from "../../actions/user-spend-limits-bulk-set.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const updates = [
  { userEmail: "a@co.com", spendLimitDollars: 100 },
  { userEmail: "b@co.com", spendLimitDollars: null },
];

Deno.test("user-spend-limits-bulk-set: posts the updates array", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        requestedCount: 2,
        updatedCount: 1,
        unchangedCount: 1,
        failedCount: 0,
        results: [],
      },
    },
  ]);
  await userSpendLimitsBulkSet.execute({ updates }, ctx);
  assertEquals(pathOf(calls[0].url), "/teams/user-spend-limits");
  assertEquals(JSON.parse(calls[0].body!), { updates });
});

Deno.test("user-spend-limits-bulk-set: accepts a JSON string too", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: { requestedCount: 1, updatedCount: 1, unchangedCount: 0, failedCount: 0, results: [] },
    },
  ]);
  await userSpendLimitsBulkSet.execute({ updates: JSON.stringify([updates[0]]) }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { updates: [updates[0]] });
});

Deno.test("user-spend-limits-bulk-set: rejects more than 100 updates client-side", async () => {
  const { ctx } = mockCtx([]);
  const many = Array.from(
    { length: 101 },
    (_, i) => ({ userEmail: `u${i}@co.com`, spendLimitDollars: 1 }),
  );
  await assertRejects(async () => await userSpendLimitsBulkSet.execute({ updates: many }, ctx));
});

Deno.test("user-spend-limits-bulk-set: rejects an empty array", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await userSpendLimitsBulkSet.execute({ updates: [] }, ctx));
});
