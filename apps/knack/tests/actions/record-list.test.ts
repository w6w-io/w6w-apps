import { assertEquals, assertRejects } from "@std/assert";
import recordList from "../../actions/record-list.ts";
import { mockKnackCtx, recordsPage } from "../_helpers.ts";

Deno.test("record-list: GETs the object's records with rows_per_page/page defaults passed through", async () => {
  const { ctx, calls } = mockKnackCtx([{ body: recordsPage([{ id: "r1", field_1: "Acme" }]) }]);
  const result = await recordList.execute(
    { objectKey: "object_1", page: 1, rowsPerPage: 25 },
    ctx,
  );
  assertEquals(result, recordsPage([{ id: "r1", field_1: "Acme" }]));
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/objects/object_1/records");
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(url.searchParams.get("rows_per_page"), "25");
  assertEquals(calls[0].method, "GET");
});

Deno.test("record-list: sort_order is only sent when a sort field is set", async () => {
  const { ctx, calls } = mockKnackCtx([{ body: recordsPage([]) }]);
  await recordList.execute({ objectKey: "object_1", sortOrder: "desc" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("sort_field"), false);
  assertEquals(url.searchParams.has("sort_order"), false);
});

Deno.test("record-list: sort_field and sort_order both go on the wire together", async () => {
  const { ctx, calls } = mockKnackCtx([{ body: recordsPage([]) }]);
  await recordList.execute({ objectKey: "object_1", sortField: "field_25", sortOrder: "asc" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("sort_field"), "field_25");
  assertEquals(url.searchParams.get("sort_order"), "asc");
});

Deno.test("record-list: the filter object is sent as a JSON string under `filters`", async () => {
  const { ctx, calls } = mockKnackCtx([{ body: recordsPage([]) }]);
  const filters = { match: "or", rules: [{ field: "field_1", operator: "is", value: "Dodgit" }] };
  await recordList.execute({ objectKey: "object_1", filters }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(JSON.parse(url.searchParams.get("filters")!), filters);
});

Deno.test("record-list: a filters value typed as a JSON string is accepted too", async () => {
  const { ctx, calls } = mockKnackCtx([{ body: recordsPage([]) }]);
  const filters = { match: "and", rules: [] };
  await recordList.execute({ objectKey: "object_1", filters: JSON.stringify(filters) }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(JSON.parse(url.searchParams.get("filters")!), filters);
});

Deno.test("record-list: an invalid filters string raises a clear error, no request made", async () => {
  const { ctx, calls } = mockKnackCtx([]);
  await assertRejects(async () => {
    await recordList.execute({ objectKey: "object_1", filters: "{not json" }, ctx);
  });
  assertEquals(calls.length, 0);
});
