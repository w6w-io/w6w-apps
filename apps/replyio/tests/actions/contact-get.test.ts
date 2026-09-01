import { assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-get: calls GET /v3/contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42, email: "a@b.com" } }]);
  const out = await contactGet.execute({ id: 42 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/contacts/42");
  assertEquals(out, { id: 42, email: "a@b.com" });
});
