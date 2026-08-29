import { assertEquals } from "@std/assert";
import transcriptWordSearch from "../../actions/transcript-word-search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("transcript-word-search: comma-joins the words array into one query param", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "t1", total_count: 2, matches: [{ text: "smoke", count: 2 }] },
  }]);
  const out = await transcriptWordSearch.execute(
    { transcriptId: "t1", words: ["smoke", "wildfires"] },
    ctx,
  ) as { total_count: number };
  assertEquals(pathOf(calls[0].url), "/v2/transcript/t1/word-search");
  assertEquals(queryOf(calls[0].url).words, "smoke,wildfires");
  assertEquals(out.total_count, 2);
});

Deno.test("transcript-word-search: accepts a comma-string as well as an array", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "t1", total_count: 0, matches: [] },
  }]);
  await transcriptWordSearch.execute({ transcriptId: "t1", words: "smoke, wildfires" }, ctx);
  assertEquals(queryOf(calls[0].url).words, "smoke,wildfires");
});

Deno.test("transcript-word-search: is a search action with a required words param", () => {
  assertEquals(transcriptWordSearch.type, "search");
  const wordsParam = transcriptWordSearch.params?.find((p) => p.key === "words");
  assertEquals(wordsParam?.required, true);
});
