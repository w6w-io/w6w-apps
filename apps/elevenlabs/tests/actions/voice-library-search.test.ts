import { assertEquals } from "@std/assert";
import voiceLibrarySearch from "../../actions/voice-library-search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const PAGE = {
  voices: [{ voice_id: "lib1", public_owner_id: "owner1", name: "Narrator" }],
  has_more: false,
  total_count: 1,
};

Deno.test("voice-library-search: reads the shared-voices catalogue", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  assertEquals(await voiceLibrarySearch.execute({}, ctx), PAGE);
  assertEquals(pathOf(calls[0].url), "/v1/shared-voices");
  assertEquals(voiceLibrarySearch.type, "search");
});

Deno.test("voice-library-search: every filter reaches the query", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await voiceLibrarySearch.execute({
    search: "narrator",
    category: "professional",
    language: "en",
    gender: "female",
    age: "young",
    accent: "british",
    useCases: "narration",
    featured: true,
    sort: "trending",
    page: 0,
    pageSize: 100,
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    search: "narrator",
    category: "professional",
    language: "en",
    gender: "female",
    age: "young",
    accent: "british",
    use_cases: "narration",
    featured: "true",
    sort: "trending",
    page: "0",
    page_size: "100",
  });
});

Deno.test("voice-library-search: featured is omitted rather than sent as false", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await voiceLibrarySearch.execute({ featured: false }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

/**
 * This endpoint pages by NUMBER while /v2/voices pages by TOKEN. Confusing them
 * is the usual way a library crawl silently repeats page zero forever.
 */
Deno.test("voice-library-search: pages by number, not by token", () => {
  const keys = (voiceLibrarySearch.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("page"), true);
  assertEquals(keys.includes("nextPageToken"), false);
});
