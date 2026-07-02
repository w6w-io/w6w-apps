import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-record.ts";

Deno.test("create-record: POSTs to {baseId}/{table} with fields + typecast", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "rec1", fields: { Name: "Jane" } } }]);
  const result = await action.execute!(
    { baseId: "appABC", table: "Users", fields: { Name: "Jane" }, typecast: true },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v0/appABC/Users");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { fields: { Name: "Jane" }, typecast: true });
  assertEquals(result, { id: "rec1", fields: { Name: "Jane" } });
});

Deno.test("create-record: defaults typecast to false", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ baseId: "appABC", table: "Users", fields: { Name: "X" } }, ctx);
  assertEquals(JSON.parse(calls[0].body!).typecast, false);
});

Deno.test("create-record: URI-encodes the table segment", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { baseId: "appABC", table: "My Table", fields: {} },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v0/appABC/My%20Table");
});
