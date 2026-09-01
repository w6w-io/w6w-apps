import { assertEquals } from "@std/assert";
import { mockFreshsalesCtx } from "../_helpers.ts";
import action from "../../actions/note-create.ts";

Deno.test("note-create: POSTs to /notes, targetable pair carried verbatim", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { note: { id: 1, description: "hi" } } }]);
  const out = await action.execute(
    { description: "hi", targetableType: "Contact", targetableId: 1 },
    ctx,
  );
  assertEquals(calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/notes");
  assertEquals(calls[0].method, "POST");
  assertEquals(
    JSON.parse(calls[0].body!),
    { note: { description: "hi", targetable_type: "Contact", targetable_id: 1 } },
  );
  assertEquals(out, { id: 1, description: "hi" });
});

Deno.test("note-create: also attaches to an Account or a Deal", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { note: {} } }]);
  await action.execute({ description: "hi", targetableType: "SalesAccount", targetableId: 5 }, ctx);
  assertEquals(
    JSON.parse(calls[0].body!),
    { note: { description: "hi", targetable_type: "SalesAccount", targetable_id: 5 } },
  );
});
