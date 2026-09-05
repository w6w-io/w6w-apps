import { assertEquals, assertRejects } from "@std/assert";
import recipientCreate from "../../actions/recipient-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("recipient-create: POSTs currency/type/accountHolderName and a parsed details object", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 5, currency: "GBP" } }]);
  const out = await recipientCreate.execute(
    {
      currency: "GBP",
      type: "sort_code",
      accountHolderName: "John Doe",
      details: { sortCode: "040075", accountNumber: "37778842" },
    },
    ctx,
  ) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/2026Q3/accounts");
  assertEquals(JSON.parse(calls[0].body!), {
    currency: "GBP",
    type: "sort_code",
    accountHolderName: "John Doe",
    details: { sortCode: "040075", accountNumber: "37778842" },
  });
  assertEquals(out.id, 5);
});

Deno.test("recipient-create: accepts details as the JSON string a user types", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 5 } }]);
  await recipientCreate.execute(
    {
      currency: "GBP",
      type: "sort_code",
      accountHolderName: "John Doe",
      details: '{"sortCode":"040075"}',
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).details, { sortCode: "040075" });
});

Deno.test("recipient-create: malformed details JSON fails before any request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await recipientCreate.execute(
        { currency: "GBP", type: "sort_code", accountHolderName: "John Doe", details: "{not json" },
        ctx,
      ),
    Error,
    "Account details is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("recipient-create: is not declared idempotent", () => {
  assertEquals(recipientCreate.idempotent, false);
});
