import { assertEquals } from "@std/assert";
import fieldsList from "../../actions/fields-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("fields-list: calls GET /fields with no filters by default", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1234, name: "Deal Status" }] }]);
  await fieldsList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/fields");
  assertEquals(Object.keys(queryOf(calls[0].url)).length, 0);
});

Deno.test("fields-list: forwards list_id/value_type/entity_type filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await fieldsList.execute({ listId: 11, valueType: 3, entityType: 1 }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(q.list_id, "11");
  assertEquals(q.value_type, "3");
  assertEquals(q.entity_type, "1");
});
