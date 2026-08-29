import { assertEquals } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-update: PATCHes /contacts/{contact_id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { contact: { id: "c1", title: "VP Sales" } } }]);
  const out = await contactUpdate.execute({ contact_id: "c1", title: "VP Sales" }, ctx) as {
    contact: { title: string };
  };
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v1/contacts/c1");
  assertEquals(out.contact.title, "VP Sales");
});

Deno.test("contact-update: idempotent — a PATCH of absolute values converges on retry", () => {
  assertEquals(contactUpdate.idempotent, true);
});
