import { assertEquals, assertRejects } from "@std/assert";
import recordUpdate from "../../actions/record-update.ts";
import { mockKnackCtx } from "../_helpers.ts";

Deno.test("record-update: PUTs only the changed fields to the record's own route", async () => {
  const updated = { id: "58643557d1ea9432222f3cbb", field_1: "Updated name" };
  const { ctx, calls } = mockKnackCtx([{ body: updated }]);
  const result = await recordUpdate.execute(
    {
      objectKey: "object_1",
      recordId: "58643557d1ea9432222f3cbb",
      fields: { field_1: "Updated name" },
    },
    ctx,
  );
  assertEquals(result, updated);
  assertEquals(calls[0].method, "PUT");
  assertEquals(
    calls[0].url,
    "https://api.knack.com/v1/objects/object_1/records/58643557d1ea9432222f3cbb",
  );
  assertEquals(JSON.parse(calls[0].body!), { field_1: "Updated name" });
});

Deno.test("record-update: refuses empty field values without making a request", async () => {
  const { ctx, calls } = mockKnackCtx([]);
  await assertRejects(async () => {
    await recordUpdate.execute({ objectKey: "object_1", recordId: "r1", fields: null }, ctx);
  });
  assertEquals(calls.length, 0);
});
