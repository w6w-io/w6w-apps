import { assert, assertEquals } from "@std/assert";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import tableGet from "../../actions/table-get.ts";

Deno.test("table-get: fetches a table by its alphanumeric id, quoted", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { table: { id: "ZtEdWh", name: "Vendors", public: false } } },
  }]);
  const out = await tableGet.execute({ id: "ZtEdWh" }, ctx) as { name: string };
  assertEquals(out.name, "Vendors");
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert(q.startsWith('{ table(id: "ZtEdWh") {'));
  assert(q.includes("table_fields { id label }"));
});

Deno.test("table-get: type/resource metadata", () => {
  assertEquals(tableGet.type, "read");
  assertEquals(tableGet.resource, "table");
});
