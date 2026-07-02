import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-record.ts";

Deno.test("delete-record: DELETEs {baseId}/{table}/{recordId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "rec1", deleted: true } }]);
  const result = await action.execute!(
    { baseId: "appABC", table: "Users", recordId: "rec1" },
    ctx,
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v0/appABC/Users/rec1");
  assertEquals(result, { id: "rec1", deleted: true });
});
