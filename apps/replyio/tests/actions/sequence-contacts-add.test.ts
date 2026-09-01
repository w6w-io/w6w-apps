import { assertEquals } from "@std/assert";
import sequenceContactsAdd from "../../actions/sequence-contacts-add.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("sequence-contacts-add: POSTs contactIds (parsed from JSON) to the bulk endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: { added: [1, 2], notProcessed: {} } }]);
  const out = await sequenceContactsAdd.execute(
    { id: 9, contactIds: "[1,2]", removeFromExisting: true },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/sequences/9/contact-links/bulk");
  assertEquals(JSON.parse(calls[0].body!), { contactIds: [1, 2], removeFromExisting: true });
  assertEquals(out, { added: [1, 2], notProcessed: {} });
});

Deno.test("sequence-contacts-add: is not idempotent — a partial success/notProcessed is expected", () => {
  assertEquals(sequenceContactsAdd.idempotent, false);
});
