import { assert, assertEquals } from "@std/assert";
import { DEFAULT_DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/datasource-refresh.ts";

Deno.test("datasource-refresh: starts a job and returns its id, sending no body by default", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 202, body: { job: { id: "j1", mode: "Asynchronous" } } }],
    { display: DEFAULT_DISPLAY },
  );
  const result = await action.execute!({ datasourceId: "d1" }, ctx);
  assertEquals(result, { jobId: "j1", mode: "Asynchronous" });
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/3.21/sites/site-1/datasources/d1/refresh");
  assertEquals(calls[0].body, "{}");
});

Deno.test("datasource-refresh: incremental sets the extractRefresh body", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 202, body: { job: { id: "j1" } } }],
    { display: DEFAULT_DISPLAY },
  );
  await action.execute!({ datasourceId: "d1", incremental: true }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.extractRefresh.incremental, "true");
});

Deno.test("datasource-refresh: is honestly not idempotent — each call starts a new job", () => {
  assert(action.idempotent === false);
});
