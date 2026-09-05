import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/transaction-create.ts";

const bought = (over: Record<string, unknown> = {}) => ({
  status: 200,
  body: { object_id: "trn_1", status: "SUCCESS", tracking_number: "9205...", ...over },
});

Deno.test("transaction-create: buys with a given rate id and async:false, unwrapped body", async () => {
  const { ctx, calls } = mockCtx([bought()]);
  const result = await action.execute!({ rateId: "r1" }, ctx) as { object_id?: string };
  assertEquals(calls[0].url, "https://api.goshippo.com/transactions");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { rate: "r1", async: false });
  assertEquals(result.object_id, "trn_1");
});

Deno.test("transaction-create: without a rate id or shipment id, refuses before buying", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "shipmentId");
  assertEquals(calls.length, 0);
});

Deno.test("transaction-create: buyCheapest re-reads the shipment and sorts numerically", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        rates: [
          { object_id: "r1", amount: "10.05", provider: "UPS" },
          { object_id: "r2", amount: "9.99", provider: "USPS" },
        ],
      },
    },
    bought(),
  ]);
  await action.execute!({ shipmentId: "shp_1", buyCheapest: true }, ctx);
  assertEquals(calls[0].url, "https://api.goshippo.com/shipments/shp_1");
  assertEquals(JSON.parse(calls[1].body!).rate, "r2");
});

/** The guard worth having on anything that buys automatically. */
Deno.test("transaction-create: maxPrice refuses to buy above the ceiling", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { rates: [{ object_id: "r1", amount: "50.00", provider: "FedEx" }] } },
  ]);
  await assertRejects(
    async () => await action.execute!({ shipmentId: "shp_1", rateId: "r1", maxPrice: 20 }, ctx),
    Error,
    "refusing to buy",
  );
  // Only the read happened — no purchase call was made.
  assertEquals(calls.length, 1);
});

Deno.test("transaction-create: maxPrice allows a rate at or below the ceiling", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { rates: [{ object_id: "r1", amount: "10.00", provider: "USPS" }] } },
    bought(),
  ]);
  await action.execute!({ shipmentId: "shp_1", rateId: "r1", maxPrice: 20 }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(JSON.parse(calls[1].body!).rate, "r1");
});

Deno.test("transaction-create: a rate not on the named shipment is refused", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { rates: [{ object_id: "r1", amount: "10.00" }] } },
  ]);
  await assertRejects(
    async () => await action.execute!({ shipmentId: "shp_1", rateId: "r9", maxPrice: 20 }, ctx),
    Error,
    "not on this shipment",
  );
});

Deno.test("transaction-create: logs before the purchase call, so a mid-flight failure is recorded", async () => {
  const { ctx, logs } = mockCtx([bought()]);
  await action.execute!({ rateId: "r1" }, ctx);
  assert(logs.some((l) => /buying/.test(l.message)), JSON.stringify(logs));
  assert(logs.some((l) => /bought/.test(l.message)), JSON.stringify(logs));
});

Deno.test("transaction-create: offers a label file type selector defaulting to the account default", () => {
  const param = (action.params as Array<{ key: string; default?: unknown }>).find(
    (p) => p.key === "labelFileType",
  )!;
  assertEquals(param.default, "");
});

Deno.test("transaction-create: is not idempotent — buying twice buys twice", () => {
  assertEquals(action.idempotent, false);
});
