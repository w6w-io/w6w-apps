import { assertEquals } from "@std/assert";
import { DEFAULT_DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/datasource-list.ts";

Deno.test("datasource-list: unwraps a single data source and targets the right path", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { datasources: { datasource: { id: "d1", name: "Sales DS" } } } }],
    { display: DEFAULT_DISPLAY },
  );
  const result = await action.execute!({}, ctx) as { datasources: unknown[] };
  assertEquals(result.datasources, [{ id: "d1", name: "Sales DS" }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/3.21/sites/site-1/datasources");
});
