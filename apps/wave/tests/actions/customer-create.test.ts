import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import customerCreate from "../../actions/customer-create.ts";

Deno.test("customer-create: creates and returns the customer", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        customerCreate: {
          didSucceed: true,
          inputErrors: [],
          customer: { id: "c1", name: "Santa", email: "santa@example.com" },
        },
      },
    },
  }]);
  const out = await customerCreate.execute(
    { businessId: "b1", name: "Santa", email: "santa@example.com", city: "North Pole" },
    ctx,
  ) as { customer: { id: string } };
  assertEquals(out.customer.id, "c1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.input.name, "Santa");
  assertEquals(body.variables.input.address.city, "North Pole");
});

Deno.test("customer-create: a rejected create throws with the field-level detail", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: {
        customerCreate: {
          didSucceed: false,
          inputErrors: [{
            code: "REQUIRED",
            message: "This field is required.",
            path: ["input", "name"],
          }],
          customer: null,
        },
      },
    },
  }]);
  let threw = false;
  try {
    await customerCreate.execute({ businessId: "b1", name: "" }, ctx);
  } catch (e) {
    threw = true;
    if (!(e as Error).message.includes("input.name")) throw e;
  }
  if (!threw) throw new Error("expected a rejection");
});

Deno.test("customer-create: type/resource/idempotency metadata", () => {
  assertEquals(customerCreate.type, "perform");
  assertEquals(customerCreate.resource, "customer");
  assertEquals(customerCreate.idempotent, false);
});
