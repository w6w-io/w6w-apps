import { assert, assertEquals } from "@std/assert";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import tableRecordDelete from "../../actions/table-record-delete.ts";

Deno.test("table-record-delete: deletes and returns success", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { deleteTableRecord: { success: true } } } }]);
  const out = await tableRecordDelete.execute({ id: "1" }, ctx) as { success: boolean };
  assertEquals(out.success, true);
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assertEquals(q, "mutation { deleteTableRecord(input: { id: 1 }) { success } }");
});

Deno.test("table-record-delete: throws when success is false", async () => {
  const { ctx } = mockCtx([{ body: { data: { deleteTableRecord: { success: false } } } }]);
  let threw = false;
  try {
    await tableRecordDelete.execute({ id: "1" }, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
});

Deno.test("table-record-delete: type/resource/idempotency metadata", () => {
  assertEquals(tableRecordDelete.type, "perform");
  assertEquals(tableRecordDelete.resource, "table-record");
  assertEquals(tableRecordDelete.idempotent, true);
});
