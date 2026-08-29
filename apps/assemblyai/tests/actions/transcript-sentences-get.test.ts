import { assertEquals } from "@std/assert";
import transcriptSentencesGet from "../../actions/transcript-sentences-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("transcript-sentences-get: GETs /v2/transcript/{id}/sentences", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "t1", confidence: 0.9, audio_duration: 12, sentences: [{ text: "Hi." }] },
  }]);
  const out = await transcriptSentencesGet.execute({ transcriptId: "t1" }, ctx) as {
    sentences: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/v2/transcript/t1/sentences");
  assertEquals(out.sentences.length, 1);
});

Deno.test("transcript-sentences-get: is a read action", () => {
  assertEquals(transcriptSentencesGet.type, "read");
});
