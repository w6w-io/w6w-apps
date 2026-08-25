import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

Deno.test("contact-create: POSTs /contacts with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "CTC-1" } }]);
  await action.execute(
    { firstName: "Carrie", lastName: "Customer", email: "carrie@example.com", company: "Acme" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/contacts");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.first_name, "Carrie");
  assertEquals(body.last_name, "Customer");
  assertEquals(body.email, "carrie@example.com");
  assertEquals(body.company, "Acme");
  assertEquals(body.mobile_phone, undefined);
});
