import { assert, assertEquals } from "@std/assert";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import tableRecordCreate from "../../actions/table-record-create.ts";

Deno.test("table-record-create: creates a record with field values", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { createTableRecord: { table_record: { id: "1", title: "Acme" } } } },
  }]);
  const out = await tableRecordCreate.execute(
    {
      tableId: "ZtEdWh",
      title: "Acme",
      fields: [{ field_id: "text", field_value: "New value" }],
    },
    ctx,
  ) as { title: string };
  assertEquals(out.title, "Acme");
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert(q.startsWith("mutation { createTableRecord(input:"));
  assert(q.includes('table_id: "ZtEdWh"'));
  assert(q.includes('fields_attributes: [{ field_id: "text", field_value: "New value" }]'));
});

Deno.test("table-record-create: works with no title or field values", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { createTableRecord: { table_record: { id: "1" } } } },
  }]);
  await tableRecordCreate.execute({ tableId: "ZtEdWh" }, ctx);
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert(!q.includes("title:"));
  assert(!q.includes("fields_attributes"));
});

Deno.test("table-record-create: type/resource/idempotency metadata", () => {
  assertEquals(tableRecordCreate.type, "perform");
  assertEquals(tableRecordCreate.resource, "table-record");
  assertEquals(tableRecordCreate.idempotent, false);
});
