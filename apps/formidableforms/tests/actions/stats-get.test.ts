import { assertEquals } from "@std/assert";
import { BASE_PATH, DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/stats-get.ts";

Deno.test("stats-get: GETs /stats/{type}/{field_id}", async () => {
  const { ctx, calls } = mockCtx([{ body: 42 }], { display: DISPLAY });
  const out = await action.execute({ type: "average", fieldId: "27" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/stats/average/27`);
  assertEquals(out, 42);
});

Deno.test("stats-get: accepts a comma-separated field ID list", async () => {
  const { ctx, calls } = mockCtx([{ body: 0 }], { display: DISPLAY });
  await action.execute({ type: "count", fieldId: "27,28" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/stats/count/27%2C28`);
});
