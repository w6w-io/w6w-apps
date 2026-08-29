import { assertEquals } from "@std/assert";
import transcriptSubtitlesGet from "../../actions/transcript-subtitles-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const VTT = "WEBVTT\n\n00:00.250 --> 00:06.350\nSmoke from hundreds of wildfires.";

Deno.test("transcript-subtitles-get: GETs /v2/transcript/{id}/{format} and returns raw text, not JSON", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: VTT }]);
  const out = await transcriptSubtitlesGet.execute(
    { transcriptId: "t1", subtitleFormat: "vtt", charsPerCaption: 40 },
    ctx,
  ) as { subtitles: string };
  assertEquals(pathOf(calls[0].url), "/v2/transcript/t1/vtt");
  assertEquals(queryOf(calls[0].url).chars_per_caption, "40");
  assertEquals(out.subtitles.startsWith("WEBVTT"), true);
});

Deno.test("transcript-subtitles-get: defaults to srt and offers both formats", () => {
  const formatParam = transcriptSubtitlesGet.params?.find((p) => p.key === "subtitleFormat");
  assertEquals(formatParam?.default, "srt");
  assertEquals(
    (formatParam?.options as { value: string }[] | undefined)?.map((o) => o.value).sort(),
    ["srt", "vtt"],
  );
});
