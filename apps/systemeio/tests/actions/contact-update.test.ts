import { assertEquals } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-update: PATCHes with application/merge-patch+json", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await contactUpdate.execute(
    { id: "1", locale: "fr", fields: [{ slug: "phone_number", value: null }] },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/contacts/1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].headers["content-type"], "application/merge-patch+json");
  assertEquals(
    JSON.parse(calls[0].body!),
    { locale: "fr", fields: [{ slug: "phone_number", value: null }] },
  );
});

Deno.test("contact-update: never sends an email field — the vendor's patch schema has none", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await contactUpdate.execute({ id: "1", locale: "en" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("email" in body, false);
});
