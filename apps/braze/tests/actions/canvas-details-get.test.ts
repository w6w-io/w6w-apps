import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/canvas-details-get.ts";

Deno.test("canvas-details-get: sends canvas_id as a query param", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { name: "Onboarding" } }], {
    display: { instance: "iad-01" },
  });
  const result = await action.execute!({ canvasId: "canv1" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/canvas/details");
  assertEquals(q.get("canvas_id"), "canv1");
  assertEquals(result, { name: "Onboarding" });
});
