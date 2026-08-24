import { assertEquals } from "@std/assert";
import noteCreate from "../../actions/note-create.ts";
import { envelope, mockCtx } from "../_helpers.ts";

/**
 * The schema's top-level `required` lists BOTH `contact` and `matter` as
 * mandatory, but each field's own description says it's required only when
 * `type` selects it. This app follows the field-level rule.
 */
Deno.test("note-create: a Matter note sends only the matter ref, never a contact ref", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: 1 }) }]);
  await noteCreate.execute(
    { type: "Matter", matterId: 4, contactId: 99, detail: "Called client" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!).data;
  assertEquals(body.matter, { id: 4 });
  assertEquals("contact" in body, false);
});

Deno.test("note-create: a Contact note sends only the contact ref, never a matter ref", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: 1 }) }]);
  await noteCreate.execute({
    type: "Contact",
    contactId: 7,
    matterId: 55,
    detail: "Left voicemail",
  }, ctx);
  const body = JSON.parse(calls[0].body!).data;
  assertEquals(body.contact, { id: 7 });
  assertEquals("matter" in body, false);
});
