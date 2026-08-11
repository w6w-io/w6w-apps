import { assert, assertEquals, assertRejects } from "@std/assert";
import tableList from "../../actions/table-list.ts";
import fieldList from "../../actions/field-list.ts";
import rowList from "../../actions/row-list.ts";
import rowGet from "../../actions/row-get.ts";
import rowCreate from "../../actions/row-create.ts";
import rowUpdate from "../../actions/row-update.ts";
import rowDelete from "../../actions/row-delete.ts";
import rowMove from "../../actions/row-move.ts";
import rowNames from "../../actions/row-names.ts";
import rowsCreateBatch from "../../actions/rows-create-batch.ts";
import rowsUpdateBatch from "../../actions/rows-update-batch.ts";
import rowsDeleteBatch from "../../actions/rows-delete-batch.ts";
import { mockBaserowCtx, page } from "../_helpers.ts";

Deno.test("table-list: takes no parameters and hits the token-scoped endpoint", async () => {
  const { ctx, calls } = mockBaserowCtx([{ body: [{ id: 1, name: "Tasks", database_id: 42 }] }]);
  await tableList.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/database/tables/all-tables/");
  assertEquals(tableList.params?.length ?? 0, 0);
});

Deno.test("field-list: builds the table-scoped fields path", async () => {
  const { ctx, calls } = mockBaserowCtx([{ body: [] }]);
  await fieldList.execute({ tableId: 7 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/database/fields/table/7/");
});

/**
 * The default that matters most: without `user_field_names=true` every row
 * comes back keyed `field_4321`.
 */
Deno.test("row-list: sends user_field_names=true by default", async () => {
  const { ctx, calls } = mockBaserowCtx([{ body: page([]) }]);
  await rowList.execute({ tableId: 1 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("user_field_names"), "true");
});

Deno.test("row-list: an explicit false is honoured", async () => {
  const { ctx, calls } = mockBaserowCtx([{ body: page([]) }]);
  await rowList.execute({ tableId: 1, userFieldNames: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("user_field_names"), "false");
});

Deno.test("row-list: maps search, ordering, view and paging onto Baserow's names", async () => {
  const { ctx, calls } = mockBaserowCtx([{ body: page([]) }]);
  await rowList.execute({
    tableId: 1,
    viewId: 9,
    search: "ada",
    orderBy: "-Name",
    include: "Name,Age",
    exclude: "Notes",
    page: 2,
    size: 50,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/database/rows/table/1/");
  assertEquals(url.searchParams.get("view_id"), "9");
  assertEquals(url.searchParams.get("search"), "ada");
  assertEquals(url.searchParams.get("order_by"), "-Name");
  assertEquals(url.searchParams.get("include"), "Name,Age");
  assertEquals(url.searchParams.get("exclude"), "Notes");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("size"), "50");
});

/** Baserow's row filters are dynamically-named query parameters, not values. */
Deno.test("row-list: expands field filters into filter__ query parameters", async () => {
  const { ctx, calls } = mockBaserowCtx([{ body: page([]) }]);
  await rowList.execute({
    tableId: 1,
    fieldFilters: '{"filter__Name__contains":"ada","filter__Age__higher_than":30}',
    filterType: "OR",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filter__Name__contains"), "ada");
  assertEquals(url.searchParams.get("filter__Age__higher_than"), "30");
  assertEquals(url.searchParams.get("filter_type"), "OR");
});

Deno.test("row-list: refuses a filter object that is not filter__-prefixed", async () => {
  const { ctx } = mockBaserowCtx([]);
  await assertRejects(
    async () => {
      await rowList.execute({ tableId: 1, fieldFilters: '{"size":9999}' }, ctx);
    },
    Error,
    "is not a filter parameter",
  );
});

/** The filter tree goes on the wire as a JSON *string*, not as an object. */
Deno.test("row-list: serialises an object filter tree into the query string", async () => {
  const { ctx, calls } = mockBaserowCtx([{ body: page([]) }]);
  await rowList.execute({
    tableId: 1,
    filters: { filter_type: "AND", filters: [{ field: "Name", type: "contains", value: "ada" }] },
  }, ctx);
  const raw = new URL(calls[0].url).searchParams.get("filters")!;
  assertEquals(JSON.parse(raw).filter_type, "AND");
});

Deno.test("row-list: returns Baserow's envelope so paging survives", async () => {
  const { ctx } = mockBaserowCtx([{
    body: { count: 120, next: "https://baserow.example.com/…?page=2", previous: null, results: [] },
  }]);
  const out = await rowList.execute({ tableId: 1 }, ctx) as { count: number; next: string };
  assertEquals(out.count, 120);
  assert(out.next.includes("page=2"));
});

Deno.test("row-get: builds the row path and only asks for metadata when told", async () => {
  const { ctx, calls } = mockBaserowCtx([{ body: { id: 9 } }, { body: { id: 9 } }]);
  await rowGet.execute({ tableId: 1, rowId: 9 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/database/rows/table/1/9/");
  assertEquals(new URL(calls[0].url).searchParams.get("include"), null);
  await rowGet.execute({ tableId: 1, rowId: 9, includeMetadata: true }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.get("include"), "metadata");
});

Deno.test("row-create: posts the field object verbatim", async () => {
  const { ctx, calls } = mockBaserowCtx([{ body: { id: 1 } }]);
  await rowCreate.execute({ tableId: 1, fields: '{"Name":"Ada","Age":36}', before: 5 }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { Name: "Ada", Age: 36 });
  assertEquals(new URL(calls[0].url).searchParams.get("before"), "5");
});

Deno.test("row-create: is honestly not idempotent", () => {
  assertEquals(rowCreate.idempotent, false);
});

Deno.test("row-create: names bad JSON rather than sending it", async () => {
  const { ctx } = mockBaserowCtx([]);
  await assertRejects(
    async () => {
      await rowCreate.execute({ tableId: 1, fields: "{nope" }, ctx);
    },
    Error,
    "Field values is not valid JSON",
  );
});

/**
 * An explicit `null` is how a Baserow field is cleared. If this body were ever
 * run through `compact`, clearing a field would become impossible.
 */
Deno.test("row-update: PATCHes the body verbatim, keeping an explicit null", async () => {
  const { ctx, calls } = mockBaserowCtx([{ body: { id: 9 } }]);
  await rowUpdate.execute({ tableId: 1, rowId: 9, fields: { Notes: null, Age: 37 } }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { Notes: null, Age: 37 });
});

Deno.test("row-delete: DELETEs and expects no body back", async () => {
  const { ctx, calls } = mockBaserowCtx([{ status: 204 }]);
  const out = await rowDelete.execute({ tableId: 1, rowId: 9 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/database/rows/table/1/9/");
  assertEquals(out, undefined);
});

/** Move is a PATCH despite reading like a command, and it takes no body. */
Deno.test("row-move: PATCHes /move/ with before_id in the query", async () => {
  const { ctx, calls } = mockBaserowCtx([{ body: { id: 9 } }]);
  await rowMove.execute({ tableId: 1, rowId: 9, beforeId: 3 }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/api/database/rows/table/1/9/move/");
  assertEquals(new URL(calls[0].url).searchParams.get("before_id"), "3");
  assertEquals(calls[0].body, null);
});

/** Omitting before_id means "move to the end" — it is not a missing argument. */
Deno.test("row-move: omitting before_id sends no before_id at all", async () => {
  const { ctx, calls } = mockBaserowCtx([{ body: { id: 9 } }]);
  await rowMove.execute({ tableId: 1, rowId: 9 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("before_id"), null);
});

Deno.test("row-names: builds the dynamically-named table__{id} parameter", async () => {
  const { ctx, calls } = mockBaserowCtx([{ body: { "42": { "1": "Ada" } } }]);
  await rowNames.execute({ tableId: 42, rowIds: "1, 2 ,3" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/database/rows/names/");
  assertEquals(url.searchParams.get("table__42"), "1,2,3");
});

Deno.test("rows-create-batch: wraps the array in Baserow's items envelope", async () => {
  const { ctx, calls } = mockBaserowCtx([{ body: { items: [] } }]);
  await rowsCreateBatch.execute({ tableId: 1, items: '[{"Name":"Ada"},{"Name":"Grace"}]' }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/database/rows/table/1/batch/");
  assertEquals(JSON.parse(calls[0].body!), { items: [{ Name: "Ada" }, { Name: "Grace" }] });
});

/**
 * The 200-item ceiling is the vendor's, and catching it here means a workflow
 * is told before it builds and ships a payload the server will reject whole.
 */
Deno.test("rows-create-batch: refuses more than 200 rows before sending", async () => {
  const { ctx, calls } = mockBaserowCtx([]);
  const tooMany = JSON.stringify(Array.from({ length: 201 }, (_, i) => ({ Name: `n${i}` })));
  await assertRejects(
    async () => {
      await rowsCreateBatch.execute({ tableId: 1, items: tooMany }, ctx);
    },
    Error,
    "exceeds Baserow's batch maximum of 200",
  );
  assertEquals(calls.length, 0, "nothing should have been sent");
});

Deno.test("rows-create-batch: rejects a non-array and an empty array", async () => {
  const { ctx } = mockBaserowCtx([]);
  await assertRejects(
    async () => {
      await rowsCreateBatch.execute({ tableId: 1, items: '{"Name":"Ada"}' }, ctx);
    },
    Error,
    "must be an array",
  );
  await assertRejects(
    async () => {
      await rowsCreateBatch.execute({ tableId: 1, items: "[]" }, ctx);
    },
    Error,
    "empty",
  );
});

Deno.test("rows-update-batch: PATCHes the batch path", async () => {
  const { ctx, calls } = mockBaserowCtx([{ body: { items: [] } }]);
  await rowsUpdateBatch.execute({ tableId: 1, items: [{ id: 1, Name: "Ada" }] }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/api/database/rows/table/1/batch/");
  assertEquals(JSON.parse(calls[0].body!), { items: [{ id: 1, Name: "Ada" }] });
});

/**
 * A batch update item without an `id` is a validation error, not "create this
 * row". Naming the offending index turns an opaque 400 into a fixable message.
 */
Deno.test("rows-update-batch: names the first item missing an id", async () => {
  const { ctx, calls } = mockBaserowCtx([]);
  await assertRejects(
    async () => {
      await rowsUpdateBatch.execute(
        { tableId: 1, items: [{ id: 1, Name: "Ada" }, { Name: "Grace" }] },
        ctx,
      );
    },
    Error,
    "item at index 1 has no numeric `id`",
  );
  assertEquals(calls.length, 0);
});

/** Batch delete is a POST with a body, not a DELETE — a portability workaround. */
Deno.test("rows-delete-batch: POSTs integer ids to batch-delete", async () => {
  const { ctx, calls } = mockBaserowCtx([{ status: 204 }]);
  await rowsDeleteBatch.execute({ tableId: 1, rowIds: "12,13,14" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/database/rows/table/1/batch-delete/");
  assertEquals(JSON.parse(calls[0].body!), { items: [12, 13, 14] });
});

Deno.test("rows-delete-batch: refuses a non-numeric id before sending", async () => {
  const { ctx, calls } = mockBaserowCtx([]);
  await assertRejects(
    async () => {
      await rowsDeleteBatch.execute({ tableId: 1, rowIds: "12,oops" }, ctx);
    },
    Error,
    "not a row id",
  );
  assertEquals(calls.length, 0);
});

/**
 * `send_webhook_events` is exposed because a bulk load that fans out to every
 * webhook is a real way to melt a downstream system. Absent means the vendor
 * default applies; `false` must actually reach the wire.
 */
Deno.test("writes: send_webhook_events is absent unless set, and false is sent", async () => {
  const { ctx, calls } = mockBaserowCtx([{ body: { id: 1 } }, { body: { id: 1 } }]);
  await rowCreate.execute({ tableId: 1, fields: "{}" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("send_webhook_events"), null);
  await rowCreate.execute({ tableId: 1, fields: "{}", sendWebhookEvents: false }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.get("send_webhook_events"), "false");
});
