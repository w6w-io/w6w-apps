import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/canvas-trigger-send.ts";

Deno.test("canvas-trigger-send: posts canvas_id and canvas_entry_properties", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], { display: { instance: "iad-01" } });
  await action.execute!({
    canvasId: "canv1",
    canvasEntryProperties: { product: "shoes" },
    recipients: [{ external_user_id: "u1" }],
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.canvas_id, "canv1");
  assertEquals(body.canvas_entry_properties, { product: "shoes" });
  assertEquals(body.recipients, [{ external_user_id: "u1" }]);
});
