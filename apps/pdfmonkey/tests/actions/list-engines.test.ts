import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-engines.ts";

Deno.test("list-engines: GETs /engines and returns the parsed body unchanged", async () => {
  const body = {
    pdf_engines: [
      { id: "5c709522-90db-4aea-b49f-15aeaa7180c7", name: "v4", deprecated_on: null },
      { id: "61749ef7-6aca-4edb-84ca-685adb638c34", name: "v3", deprecated_on: null },
    ],
    meta: { current_page: 1, total_pages: 1 },
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({}, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/engines");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, body);
});
