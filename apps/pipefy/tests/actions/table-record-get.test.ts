import { assert, assertEquals } from "@std/assert";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import tableRecordGet from "../../actions/table-record-get.ts";

Deno.test("table-record-get: fetches a record by numeric id", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { table_record: { id: "987654", title: "Acme Corp" } } },
  }]);
  const out = await tableRecordGet.execute({ id: "987654" }, ctx) as { title: string };
  assertEquals(out.title, "Acme Corp");
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert(q.startsWith("{ table_record(id: 987654) {"));
  assert(q.includes("created_by { id }"));
  assert(q.includes("required"));
});

Deno.test("table-record-get: type/resource metadata", () => {
  assertEquals(tableRecordGet.type, "read");
  assertEquals(tableRecordGet.resource, "table-record");
});
