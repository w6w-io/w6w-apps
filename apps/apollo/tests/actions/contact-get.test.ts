import { assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-get: GETs /contacts/{contact_id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { contact: { id: "c1" } } }]);
  const out = await contactGet.execute({ contact_id: "c1" }, ctx) as { contact: { id: string } };
  assertEquals(pathOf(calls[0].url), "/api/v1/contacts/c1");
  assertEquals(out.contact.id, "c1");
});
