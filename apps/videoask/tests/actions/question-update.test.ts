import { assertEquals } from "@std/assert";
import questionUpdate from "../../actions/question-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("question-update: merges Body(JSON) (e.g. metadata.text) with typed media fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await questionUpdate.execute(
    {
      questionId: "q1",
      mediaUrl: "https://example.com/v.mp4",
      body: { metadata: { text: "What's the meaning of life?" } },
    },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/questions/q1");
  assertEquals(JSON.parse(calls[0].body!), {
    metadata: { text: "What's the meaning of life?" },
    media_url: "https://example.com/v.mp4",
  });
});
