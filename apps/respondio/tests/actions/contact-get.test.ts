import { assert, assertEquals, assertRejects } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-get: GETs /contact/{identifier} and returns the contact verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, firstName: "Ada", email: "ada@example.com" } }]);
  const out = await contactGet.execute({ identifier: "id:1" }, ctx) as { id: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/contact/id:1");
  assertEquals(out.id, 1);
});

Deno.test("contact-get: accepts an email: identifier", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 2 } }]);
  await contactGet.execute({ identifier: "email:ada@example.com" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/contact/email:ada@example.com");
});

Deno.test("contact-get: accepts a phone: identifier", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 3 } }]);
  await contactGet.execute({ identifier: "phone:+60123456789" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/contact/phone:+60123456789");
});

Deno.test("contact-get: an identifier outside the three documented shapes is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await contactGet.execute({ identifier: "not-a-real-shape" }, ctx),
    Error,
    "Invalid contact identifier",
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-get: is a read action requiring no auth-scope surprises", () => {
  assertEquals(contactGet.type, "read");
  assert(Array.isArray(contactGet.output));
});
