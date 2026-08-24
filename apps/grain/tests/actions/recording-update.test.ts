import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/recording-update.ts";

Deno.test("recording-update: PATCHes the recording with the new title", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const result = await action.execute({ recordingId: "r1", title: "A new title" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/_/public-api/v2/recordings/r1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { title: "A new title" });
  assertEquals(result, { success: true });
});

Deno.test("recording-update: defaults success to false when Grain omits it", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const result = await action.execute({ recordingId: "r1", title: "x" }, ctx);
  assertEquals(result, { success: false });
});

Deno.test("recording-update: is an idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
