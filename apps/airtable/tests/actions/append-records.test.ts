import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/append-records.ts";

Deno.test("append-records: POSTs a records[] batch", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
  await action.execute!(
    {
      baseId: "appABC",
      table: "Users",
      records: [{ fields: { Name: "A" } }, { fields: { Name: "B" } }],
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.records.length, 2);
  assertEquals(body.typecast, false);
});

Deno.test("append-records: forwards typecast=true", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
  await action.execute!(
    { baseId: "appABC", table: "Users", records: [{ fields: {} }], typecast: true },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).typecast, true);
});
