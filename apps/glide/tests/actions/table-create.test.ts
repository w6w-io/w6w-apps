import { assert, assertEquals } from "@std/assert";
import tableCreate from "../../actions/table-create.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("table-create: sends name/schema/rows in the JSON body, onSchemaError as a query param", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ tableID: "t1", jobID: "j1" }) }]);
  const out = await tableCreate.execute({
    name: "Employees",
    rows: [{ fullName: "Ada" }],
    onSchemaError: "updateSchema",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/tables");
  assertEquals(calls[0].method, "POST");
  assertEquals(queryOf(calls[0].url), { onSchemaError: "updateSchema" });
  assertEquals(JSON.parse(calls[0].body!), { name: "Employees", rows: [{ fullName: "Ada" }] });
  assertEquals(out, { tableID: "t1", jobID: "j1" });
});

Deno.test("table-create: accepts a stash reference in place of inline rows", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ tableID: "t1", jobID: "j1" }) }]);
  await tableCreate.execute({ name: "Employees", rows: { $stashID: "20240215-job32" } }, ctx);
  assertEquals(JSON.parse(calls[0].body!).rows, { $stashID: "20240215-job32" });
});

Deno.test("table-create: parses a JSON-string schema param", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ tableID: "t1", jobID: "j1" }) }]);
  await tableCreate.execute({
    name: "Employees",
    rows: [],
    schema: '{"columns":[{"id":"fullName","type":{"kind":"string"}}]}',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).schema, {
    columns: [{ id: "fullName", type: { kind: "string" } }],
  });
});

Deno.test("table-create: splits comma-separated appsToLink and omits it when blank", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ tableID: "t1", jobID: "j1" }) }]);
  await tableCreate.execute({ name: "X", rows: [], appsToLink: "app1, app2" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).appsToLink, ["app1", "app2"]);
});

Deno.test("table-create: sets x-glide-asynchronous only when the caller states it", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: envelope({ tableID: "t1", jobID: "j1" }) },
    { status: 201, body: envelope({ tableID: "t2", jobID: "j2" }) },
  ]);
  await tableCreate.execute({ name: "X", rows: [], asynchronous: true }, ctx);
  assertEquals(calls[0].headers["x-glide-asynchronous"], "true");

  await tableCreate.execute({ name: "Y", rows: [] }, ctx);
  assert(!("x-glide-asynchronous" in calls[1].headers));
});

Deno.test("table-create: not idempotent", () => {
  assertEquals(tableCreate.idempotent, false);
});
