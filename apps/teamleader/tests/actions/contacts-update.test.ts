import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contacts-update.ts";

Deno.test("contacts-update: POSTs contacts.update with id and returns {id} on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute({ id: "1", firstName: "New Name" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/contacts.update");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.id, "1");
  assertEquals(body.first_name, "New Name");
  assertEquals(out, { id: "1" });
});

Deno.test("contacts-update: passes custom_fields_update_strategy through verbatim", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({
    id: "1",
    customFields: [{ id: "cf1", value: "x" }],
    customFieldsUpdateStrategy: "partial",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.custom_fields_update_strategy, "partial");
  assertEquals(body.custom_fields, [{ id: "cf1", value: "x" }]);
});
