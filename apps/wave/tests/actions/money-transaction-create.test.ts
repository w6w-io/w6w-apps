import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import moneyTransactionCreate from "../../actions/money-transaction-create.ts";

Deno.test("money-transaction-create: builds anchor + single-category line item", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        moneyTransactionCreate: { didSucceed: true, inputErrors: [], transaction: { id: "t1" } },
      },
    },
  }]);
  const out = await moneyTransactionCreate.execute(
    {
      businessId: "b1",
      externalId: "ref-1",
      date: "2021-02-05",
      description: "My first sale",
      anchorAccountId: "checking",
      anchorAmount: 100,
      anchorDirection: "DEPOSIT",
      categoryAccountId: "sales",
      categoryAmount: 100,
      categoryBalance: "INCREASE",
    },
    ctx,
  ) as { transaction: { id: string } };
  assertEquals(out.transaction.id, "t1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.input.anchor, {
    accountId: "checking",
    amount: 100,
    direction: "DEPOSIT",
  });
  assertEquals(body.variables.input.lineItems, [{
    accountId: "sales",
    amount: 100,
    balance: "INCREASE",
  }]);
});

Deno.test("money-transaction-create: an explicit `lineItems` JSON array overrides the single-category fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        moneyTransactionCreate: { didSucceed: true, inputErrors: [], transaction: { id: "t1" } },
      },
    },
  }]);
  await moneyTransactionCreate.execute(
    {
      businessId: "b1",
      externalId: "ref-1",
      date: "2021-02-05",
      description: "Split sale",
      anchorAccountId: "checking",
      anchorAmount: 100,
      anchorDirection: "DEPOSIT",
      categoryAccountId: "ignored",
      lineItems: [
        { accountId: "sales", amount: 60, balance: "INCREASE" },
        { accountId: "shipping-income", amount: 40, balance: "INCREASE" },
      ],
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.input.lineItems.length, 2);
});

Deno.test("money-transaction-create: an unbalanced total is rejected via inputErrors", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: {
        moneyTransactionCreate: {
          didSucceed: false,
          inputErrors: [{
            code: "UNBALANCED",
            message: "Line items must balance the anchor amount.",
            path: ["input", "lineItems"],
          }],
          transaction: null,
        },
      },
    },
  }]);
  let threw = false;
  try {
    await moneyTransactionCreate.execute(
      {
        businessId: "b1",
        externalId: "ref-1",
        date: "2021-02-05",
        description: "Bad split",
        anchorAccountId: "checking",
        anchorAmount: 100,
        anchorDirection: "DEPOSIT",
        categoryAccountId: "sales",
        categoryAmount: 50,
        categoryBalance: "INCREASE",
      },
      ctx,
    );
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("expected a rejection");
});

Deno.test("money-transaction-create: type/resource/idempotency metadata", () => {
  assertEquals(moneyTransactionCreate.type, "perform");
  assertEquals(moneyTransactionCreate.resource, "transaction");
  assertEquals(moneyTransactionCreate.idempotent, false);
});
