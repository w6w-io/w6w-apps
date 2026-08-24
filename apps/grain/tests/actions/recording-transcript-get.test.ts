import { assertEquals } from "@std/assert";
import { mockCtx, outputKeys } from "../_helpers.ts";
import action from "../../actions/recording-transcript-get.ts";

Deno.test("recording-transcript-get: GETs the transcript and wraps the bare array under entries", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ speaker: "Obi Wan Kenobi", text: "Hello there.", start: 8000, end: 9000 }],
  }]);
  const result = await action.execute({ recordingId: "r1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/_/public-api/v2/recordings/r1/transcript");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, {
    entries: [{ speaker: "Obi Wan Kenobi", text: "Hello there.", start: 8000, end: 9000 }],
  });
});

Deno.test("recording-transcript-get: defaults to an empty array when the body isn't an array", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const result = await action.execute({ recordingId: "r1" }, ctx);
  assertEquals(result, { entries: [] });
});

Deno.test("recording-transcript-get: is a read action", () => {
  assertEquals(action.type, "read");
  assertEquals(outputKeys(action), ["entries"]);
});
