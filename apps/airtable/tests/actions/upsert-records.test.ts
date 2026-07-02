import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/upsert-records.ts";

Deno.test("upsert-records: PATCHes with performUpsert.fieldsToMergeOn", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
  await action.execute!(
    {
      baseId: "appABC",
      table: "Users",
      records: [{ fields: { Email: "a@b", Name: "Jane" } }],
      fieldsToMergeOn: ["Email"],
    },
    ctx,
  );
  assertEquals(calls[0].method, "PATCH");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.performUpsert, { fieldsToMergeOn: ["Email"] });
  assertEquals(body.records.length, 1);
  assertEquals(body.typecast, false);
});

Deno.test("upsert-records: replace=true switches to PUT", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
  await action.execute!(
    {
      baseId: "appABC",
      table: "Users",
      records: [{ fields: {} }],
      fieldsToMergeOn: ["Email"],
      replace: true,
    },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
});

Deno.test("upsert-records: forwards typecast=true", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
  await action.execute!(
    {
      baseId: "appABC",
      table: "Users",
      records: [{ fields: {} }],
      fieldsToMergeOn: ["Email"],
      typecast: true,
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).typecast, true);
});
