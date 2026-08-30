import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import estimateCreate from "../../actions/estimate-create.ts";

Deno.test("estimate-create: single-item convenience builds a one-element items array", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        estimateCreate: {
          didSucceed: true,
          inputErrors: [],
          estimate: { id: "est1", estimateNumber: "EST-001" },
        },
      },
    },
  }]);
  const out = await estimateCreate.execute(
    { businessId: "b1", customerId: "c1", productId: "p1", quantity: 2 },
    ctx,
  ) as { estimate: { id: string } };
  assertEquals(out.estimate.id, "est1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.input.items, [{ productId: "p1", quantity: 2 }]);
  // EstimateCreateStatus has exactly one value (DRAFT); no status param is sent.
  assertEquals(body.variables.input.status, undefined);
});

Deno.test("estimate-create: an explicit `items` JSON array overrides the single-item fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: { estimateCreate: { didSucceed: true, inputErrors: [], estimate: { id: "est1" } } },
    },
  }]);
  await estimateCreate.execute(
    {
      businessId: "b1",
      customerId: "c1",
      productId: "ignored",
      items: [{ productId: "p2", quantity: 5 }],
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.input.items, [{ productId: "p2", quantity: 5 }]);
});

Deno.test("estimate-create: a rejected create throws", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: {
        estimateCreate: {
          didSucceed: false,
          inputErrors: [{ code: "REQUIRED", message: "Required.", path: ["input", "customerId"] }],
          estimate: null,
        },
      },
    },
  }]);
  let threw = false;
  try {
    await estimateCreate.execute({ businessId: "b1", customerId: "" }, ctx);
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("expected a rejection");
});

Deno.test("estimate-create: type/resource/idempotency metadata", () => {
  assertEquals(estimateCreate.type, "perform");
  assertEquals(estimateCreate.resource, "estimate");
  assertEquals(estimateCreate.idempotent, false);
});
