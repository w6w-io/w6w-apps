import { assertEquals, assertRejects } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { bodyOf, envelope, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-create: POSTs name and email to /api/contacts", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: 5 }) }]);
  const out = await contactCreate.execute(
    { name: "John Doe", email: "john@example.com" },
    ctx,
  ) as { data: { id: number } };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/contacts");
  assertEquals(bodyOf(calls[0]), { name: "John Doe", email: "john@example.com" });
  assertEquals(out.data.id, 5);
});

Deno.test("contact-create: an omitted timezone is not sent as an empty string", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({}) }]);
  await contactCreate.execute({ name: "A", email: "a@example.com", timezone: "" }, ctx);
  assertEquals(bodyOf(calls[0]), { name: "A", email: "a@example.com" });
});

/**
 * The one operation in the whole API gated on a lifetime subscription. A bare
 * "402" would leave the user hunting; TidyCal's own sentence names the cause.
 */
Deno.test("contact-create: the lifetime-subscription 402 keeps TidyCal's reason", async () => {
  const { ctx } = mockCtx([{ status: 402, body: errorBody("Lifetime subscription required") }]);
  const err = await assertRejects(
    () => Promise.resolve(contactCreate.execute({ name: "A", email: "a@example.com" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("402"), true, err.message);
  assertEquals(err.message.includes("Lifetime subscription required"), true, err.message);
});
