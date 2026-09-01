import { assertEquals, assertRejects } from "@std/assert";
import { DEFAULT_DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/datasource-get.ts";

Deno.test("datasource-get: reads one data source by id", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { datasource: { id: "d1", name: "Sales DS", isCertified: true } } }],
    { display: DEFAULT_DISPLAY },
  );
  const result = await action.execute!({ datasourceId: "d1" }, ctx);
  assertEquals(result, { id: "d1", name: "Sales DS", isCertified: true });
  assertEquals(new URL(calls[0].url).pathname, "/api/3.21/sites/site-1/datasources/d1");
});

Deno.test("datasource-get: requires a datasourceId before any network call", async () => {
  const { ctx, calls } = mockCtx([], { display: DEFAULT_DISPLAY });
  await assertRejects(
    () => Promise.resolve(action.execute!({}, ctx)),
    Error,
    "`datasourceId` is required",
  );
  assertEquals(calls.length, 0);
});
