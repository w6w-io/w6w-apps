import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-many-databases.ts";

Deno.test("get-many-databases: walks /search until has_more is false", async () => {
  const { ctx, calls } = mockCtx([
    { body: { object: "list", results: [{ id: "db-1" }], next_cursor: "cur-2", has_more: true } },
    { body: { object: "list", results: [{ id: "db-2" }], next_cursor: null, has_more: false } },
  ]);
  const result = await action.execute({}, ctx);
  assertEquals(calls.length, 2);
  assertEquals(result.results, [{ id: "db-1" }, { id: "db-2" }]);
  // Second call should include the cursor from the first response.
  const secondBody = JSON.parse(calls[1].body ?? "{}");
  assertEquals(secondBody.start_cursor, "cur-2");
});
