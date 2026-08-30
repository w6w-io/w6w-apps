import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import customerEdit from "../../actions/customer-edit.ts";

Deno.test("customer-edit: patches only the given fields", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        customerPatch: {
          didSucceed: true,
          inputErrors: [],
          customer: { id: "c1", email: "new@example.com" },
        },
      },
    },
  }]);
  const out = await customerEdit.execute({ customerId: "c1", email: "new@example.com" }, ctx) as {
    customer: { email: string };
  };
  assertEquals(out.customer.email, "new@example.com");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables.input, { id: "c1", email: "new@example.com" });
});

Deno.test("customer-edit: type/resource/idempotency metadata", () => {
  assertEquals(customerEdit.type, "perform");
  assertEquals(customerEdit.resource, "customer");
  assertEquals(customerEdit.idempotent, true);
});
