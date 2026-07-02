import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-record.ts";

Deno.test("update-record: PATCHes {baseId}/{table}/{recordId} by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "rec1" } }]);
  await action.execute!(
    { baseId: "appABC", table: "Users", recordId: "rec1", fields: { Name: "Jane" } },
    ctx,
  );
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/v0/appABC/Users/rec1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.fields, { Name: "Jane" });
  assertEquals(body.typecast, false);
});

Deno.test("update-record: replace=true switches to PUT", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      baseId: "appABC",
      table: "Users",
      recordId: "rec1",
      fields: { Name: "Jane" },
      replace: true,
    },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
});

Deno.test("update-record: forwards typecast=true", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      baseId: "appABC",
      table: "Users",
      recordId: "rec1",
      fields: { Score: "42" },
      typecast: true,
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).typecast, true);
});
