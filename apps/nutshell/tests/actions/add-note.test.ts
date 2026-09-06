import { assertEquals } from "@std/assert";
import addNote from "../../actions/add-note.ts";
import { mockCtx, rpcBody } from "../_helpers.ts";

Deno.test("add-note: is a non-idempotent perform action", () => {
  assertEquals(addNote.type, "perform");
  assertEquals(addNote.idempotent, false);
});

Deno.test("add-note: calls newNote with the entity object and a plain-string note", async () => {
  const { ctx, calls } = mockCtx([{ result: { id: 99 } }]);
  const result = await addNote.execute({
    entityType: "Leads",
    entityId: "42",
    note: "Called back, interested",
  }, ctx);

  assertEquals(rpcBody(calls[0]).method, "newNote");
  assertEquals(rpcBody(calls[0]).params, {
    entity: { entityType: "Leads", id: 42 },
    note: "Called back, interested",
  });
  assertEquals(result.id, 99);
});
