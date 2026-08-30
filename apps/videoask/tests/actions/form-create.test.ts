import { assertEquals } from "@std/assert";
import formCreate from "../../actions/form-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("form-create: POSTs only the fields the caller set, with the right wire names", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { form_id: "f1", title: "My VideoAsk" } }]);
  const out = await formCreate.execute(
    { title: "My VideoAsk", requiresContactEmail: true, showConsent: false },
    ctx,
  ) as { result: { form_id: string } };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/forms");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    title: "My VideoAsk",
    requires_contact_email: true,
    show_consent: false,
  });
  assertEquals(out.result.form_id, "f1");
});

Deno.test("form-create: an unset boolean is omitted, not sent as false", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { form_id: "f1" } }]);
  await formCreate.execute({ title: "x" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("requires_contact_email" in body, false);
});
