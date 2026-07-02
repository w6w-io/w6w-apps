import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-record.ts";

Deno.test("get-record: GETs {baseId}/{table}/{recordId}", async () => {
  const body = { id: "rec1", fields: { Name: "Jane" } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    { baseId: "appABC", table: "Users", recordId: "rec1" },
    ctx,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v0/appABC/Users/rec1");
  assertEquals(result, body);
});
