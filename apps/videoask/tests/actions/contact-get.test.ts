import { assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-get: defaults include_answers/include_messages to true", async () => {
  const { ctx, calls } = mockCtx([{ body: { contact_id: "c1", name: "s" } }]);
  await contactGet.execute({ formId: "f1", contactId: "c1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/forms/f1/contacts/c1");
  assertEquals(queryOf(calls[0].url), { include_answers: "true", include_messages: "true" });
});

Deno.test("contact-get: both include flags can be turned off", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await contactGet.execute(
    { formId: "f1", contactId: "c1", includeAnswers: false, includeMessages: false },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), { include_answers: "false", include_messages: "false" });
});
