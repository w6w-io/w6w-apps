import { assert, assertEquals, assertRejects } from "@std/assert";
import quoteCreate from "../../actions/quote-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const QUOTE = { id: "q-1", sourceCurrency: "GBP", targetCurrency: "USD", rate: 1.3 };

Deno.test("quote-create: POSTs the currencies and amount, dropping unset fields", async () => {
  const { ctx, calls } = mockCtx([{ body: QUOTE }]);
  const out = await quoteCreate.execute(
    { profileId: 1, sourceCurrency: "GBP", targetCurrency: "USD", sourceAmount: 100 },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/2026Q3/profiles/1/quotes");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { sourceCurrency: "GBP", targetCurrency: "USD", sourceAmount: 100 });
  assertEquals(out.id, "q-1");
});

Deno.test("quote-create: sourceAmount is sent as a JSON number, not a string", async () => {
  const { ctx, calls } = mockCtx([{ body: QUOTE }]);
  await quoteCreate.execute(
    { profileId: 1, sourceCurrency: "GBP", targetCurrency: "USD", sourceAmount: 100 },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(typeof body.sourceAmount, "number");
});

Deno.test("quote-create: rejects when both sourceAmount and targetAmount are given", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await quoteCreate.execute(
        {
          profileId: 1,
          sourceCurrency: "GBP",
          targetCurrency: "USD",
          sourceAmount: 100,
          targetAmount: 130,
        },
        ctx,
      ),
    Error,
    "not both",
  );
  assertEquals(calls.length, 0);
});

Deno.test("quote-create: rejects when neither amount is given", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await quoteCreate.execute(
        { profileId: 1, sourceCurrency: "GBP", targetCurrency: "USD" },
        ctx,
      ),
    Error,
  );
  assertEquals(calls.length, 0);
});

Deno.test("quote-create: is not declared idempotent", () => {
  assertEquals(quoteCreate.idempotent, false);
});

Deno.test("quote-create: payOut hint documents the open-ended value set, not a false-closed enum", () => {
  const p = quoteCreate.params?.find((p) => p.key === "payOut");
  assert(p?.type === "string", "payOut must not be a select claiming an exhaustive enum");
});
