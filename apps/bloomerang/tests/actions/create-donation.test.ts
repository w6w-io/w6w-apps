import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-donation.ts";

Deno.test("create-donation: is a non-idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});

Deno.test("create-donation: POSTs /transaction with a single Donation designation", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Id: 1, TransactionNumber: 100 } }]);
  await action.execute({
    accountId: 42,
    date: "2026-09-01",
    amount: 100,
    method: "CreditCard",
    fundId: 7,
    note: "Annual gift",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v2/transaction");
  assertEquals(JSON.parse(calls[0].body!), {
    AccountId: 42,
    Date: "2026-09-01",
    Amount: 100,
    Method: "CreditCard",
    Designations: [
      { Type: "Donation", Amount: 100, FundId: 7, Note: "Annual gift" },
    ],
  });
});

Deno.test("create-donation: the designation amount always equals the transaction amount", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ accountId: 1, date: "2026-01-01", amount: 250 }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.Amount, 250);
  assertEquals(sent.Designations[0].Amount, 250);
});

Deno.test("create-donation: omits campaign/appeal/fee when not supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ accountId: 1, date: "2026-01-01", amount: 10 }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals("FeeAmount" in sent, false);
  assertEquals("CampaignId" in sent.Designations[0], false);
  assertEquals("AppealId" in sent.Designations[0], false);
});
