import { assertEquals } from "@std/assert";
import transcriptParagraphsGet from "../../actions/transcript-paragraphs-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("transcript-paragraphs-get: GETs /v2/transcript/{id}/paragraphs", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "t1", confidence: 0.9, audio_duration: 12, paragraphs: [{ text: "Hi there." }] },
  }]);
  const out = await transcriptParagraphsGet.execute({ transcriptId: "t1" }, ctx) as {
    paragraphs: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/v2/transcript/t1/paragraphs");
  assertEquals(out.paragraphs.length, 1);
});

Deno.test("transcript-paragraphs-get: is a read action", () => {
  assertEquals(transcriptParagraphsGet.type, "read");
});
