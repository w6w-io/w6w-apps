import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/execute-dataset-queries.ts";

Deno.test("execute-dataset-queries: POSTs executeQueries with a single-element queries array", async () => {
  const { ctx, calls } = mockCtx([{
    body: { results: [{ tables: [{ rows: [{ "MyTable[Year]": 2010 }] }] }] },
  }]);
  const out = await action.execute({ datasetId: "d1", query: "EVALUATE VALUES(MyTable)" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/datasets/d1/executeQueries");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { queries: [{ query: "EVALUATE VALUES(MyTable)" }] });
  assertEquals(out.tables?.[0].rows, [{ "MyTable[Year]": 2010 }]);
});

Deno.test("execute-dataset-queries: unwraps results[0] since only one query is ever sent", async () => {
  const { ctx } = mockCtx([{ body: { results: [{ tables: [{ rows: [] }] }] } }]);
  const out = await action.execute({ datasetId: "d1", query: "EVALUATE {1}" }, ctx);
  assertEquals(out, { tables: [{ rows: [] }] });
});

Deno.test("execute-dataset-queries: a query error still answers 200 — passed through, not thrown", async () => {
  const { ctx } = mockCtx([{
    body: { results: [{ error: { code: "DaxQueryError", message: "bad expression" } }] },
  }]);
  const out = await action.execute({ datasetId: "d1", query: "EVALUATE bogus" }, ctx);
  assertEquals(out.error, { code: "DaxQueryError", message: "bad expression" });
});

Deno.test("execute-dataset-queries: Include nulls sets serializerSettings.includeNulls only when on", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [{}] } }]);
  await action.execute({ datasetId: "d1", query: "EVALUATE {1}", includeNulls: true }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.serializerSettings, { includeNulls: true });
});

Deno.test("execute-dataset-queries: no serializerSettings field at all when Include nulls is off", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [{}] } }]);
  await action.execute({ datasetId: "d1", query: "EVALUATE {1}" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("serializerSettings" in body, false);
});

Deno.test("execute-dataset-queries: a Workspace ID scopes the call", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [{}] } }]);
  await action.execute({ groupId: "w1", datasetId: "d1", query: "EVALUATE {1}" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/groups/w1/datasets/d1/executeQueries");
});

Deno.test("execute-dataset-queries: is a search action, not a mutation", () => {
  assertEquals(action.type, "search");
});
