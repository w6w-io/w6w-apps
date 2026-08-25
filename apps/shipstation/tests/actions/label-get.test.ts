import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/label-get.ts";

Deno.test("label-get: fetches by labelId", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { label_id: "se-1", tracking_number: "1Z999", voided: false } },
  ]);
  const result = await action.execute!({ labelId: "se-1" }, ctx) as {
    labelId: string;
    voided: boolean;
  };
  assertEquals(calls[0].url, "https://api.shipstation.com/v2/labels/se-1");
  assertEquals(result.labelId, "se-1");
  assertEquals(result.voided, false);
});

Deno.test("label-get: requires labelId", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "labelId");
  assertEquals(calls.length, 0);
});
