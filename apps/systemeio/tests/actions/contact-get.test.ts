import { assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-get: fetches /api/contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42, email: "a@b.com" } }]);
  const out = await contactGet.execute({ id: "42" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/contacts/42");
  assertEquals(out, { id: 42, email: "a@b.com" });
});

Deno.test("contact-get: URL-encodes the id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await contactGet.execute({ id: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/contacts/a%2Fb");
});
