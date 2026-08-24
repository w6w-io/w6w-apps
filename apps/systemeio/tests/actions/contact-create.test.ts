import { assertEquals } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-create: posts email, locale and fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1, email: "a@b.com" } }]);
  await contactCreate.execute(
    { email: "a@b.com", locale: "en", fields: [{ slug: "country", value: "US" }] },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/contacts");
  assertEquals(calls[0].method, "POST");
  assertEquals(
    JSON.parse(calls[0].body!),
    { email: "a@b.com", locale: "en", fields: [{ slug: "country", value: "US" }] },
  );
});

Deno.test("contact-create: omits locale and fields when not provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1, email: "a@b.com" } }]);
  await contactCreate.execute({ email: "a@b.com" }, ctx);

  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.com" });
});
