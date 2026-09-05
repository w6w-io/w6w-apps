import { assert, assertEquals } from "@std/assert";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import tableRecordList from "../../actions/table-record-list.ts";

Deno.test("table-record-list: lists a table's records with default pagination", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        table_records: {
          edges: [{ node: { id: "1", title: "Acme" } }],
          pageInfo: { endCursor: "abc" },
          totalCount: 1,
        },
      },
    },
  }]);
  const out = await tableRecordList.execute({ tableId: "ZtEdWh" }, ctx) as {
    table_records: unknown[];
    endCursor: string;
    totalCount: number;
  };
  assertEquals(out.table_records.length, 1);
  assertEquals(out.endCursor, "abc");
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert(q.startsWith('{ table_records(table_id: "ZtEdWh", first: 20) {'));
});

Deno.test("table-record-list: type/resource metadata", () => {
  assertEquals(tableRecordList.type, "read");
  assertEquals(tableRecordList.resource, "table-record");
});
