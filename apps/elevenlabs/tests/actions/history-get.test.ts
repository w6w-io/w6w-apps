import { assertEquals } from "@std/assert";
import historyGet from "../../actions/history-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("history-get: reads one history item by id", async () => {
  const item = { history_item_id: "h1", request_id: "r1", text: "Hi.", voice_id: "v1" };
  const { ctx, calls } = mockCtx([{ body: item }]);
  assertEquals(await historyGet.execute({ historyItemId: "h1" }, ctx), item);
  assertEquals(pathOf(calls[0].url), "/v1/history/h1");
});

/**
 * `request_id` is the field worth having: it is what the TTS continuity
 * parameters take, so this read is how a later generation is stitched onto an
 * earlier one.
 */
Deno.test("history-get: declares request_id as an output", () => {
  const keys = (historyGet.output as Array<{ key: string }>).map((o) => o.key);
  assertEquals(keys.includes("request_id"), true);
});
