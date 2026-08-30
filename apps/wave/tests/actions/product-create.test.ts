import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import productCreate from "../../actions/product-create.ts";

Deno.test("product-create: creates and returns the product", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        productCreate: {
          didSucceed: true,
          inputErrors: [],
          product: { id: "p1", name: "LED Bulb", unitPrice: "2.0625" },
        },
      },
    },
  }]);
  const out = await productCreate.execute(
    { businessId: "b1", name: "LED Bulb", unitPrice: 2.0625, incomeAccountId: "a1" },
    ctx,
  ) as { product: { id: string } };
  assertEquals(out.product.id, "p1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.input.incomeAccountId, "a1");
});

Deno.test("product-create: a rejected create throws with field-level detail", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: {
        productCreate: {
          didSucceed: false,
          inputErrors: [{
            code: "REQUIRED",
            message: "This field is required.",
            path: ["input", "name"],
          }],
          product: null,
        },
      },
    },
  }]);
  let threw = false;
  try {
    await productCreate.execute({ businessId: "b1", name: "", unitPrice: 1 }, ctx);
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("expected a rejection");
});

Deno.test("product-create: type/resource/idempotency metadata", () => {
  assertEquals(productCreate.type, "perform");
  assertEquals(productCreate.resource, "product");
  assertEquals(productCreate.idempotent, false);
});
