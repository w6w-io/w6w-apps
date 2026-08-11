import { assertEquals } from "@std/assert";
import historyList from "../../actions/history-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const PAGE = {
  history: [{ history_item_id: "h1", text: "Hi." }],
  has_more: true,
  last_history_item_id: "h1",
  scanned_until: 1738356858,
};

Deno.test("history-list: reads the history endpoint and returns the page verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  assertEquals(await historyList.execute({}, ctx), PAGE);
  assertEquals(pathOf(calls[0].url), "/v1/history");
});

Deno.test("history-list: every filter reaches the query", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await historyList.execute({
    pageSize: 10,
    startAfterHistoryItemId: "h1",
    voiceId: "v1",
    modelId: "m1",
    source: "TTS",
    search: "hello",
    dateAfterUnix: 1738356858,
    dateBeforeUnix: 1738443258,
    sortDirection: "asc",
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    page_size: "10",
    start_after_history_item_id: "h1",
    voice_id: "v1",
    model_id: "m1",
    source: "TTS",
    search: "hello",
    date_after_unix: "1738356858",
    date_before_unix: "1738443258",
    sort_direction: "asc",
  });
});

/**
 * The vendor's default page size is 100 and its ceiling is 1,000. A workflow
 * step that silently returns a thousand records is a footgun, so this prefills
 * small — deliberately not the vendor's default.
 */
Deno.test("history-list: prefills a small page size below the vendor's own default", () => {
  const size = (historyList.params ?? []).find((p) => p.key === "pageSize");
  assertEquals(size?.default, 50);
  assertEquals(size?.validation?.max, 1000);
});

/** Paging is by cursor id, not page number — the two are not interchangeable. */
Deno.test("history-list: the cursor is the previous page's last item id", () => {
  const keys = (historyList.output as Array<{ key: string }>).map((o) => o.key);
  assertEquals(keys.includes("last_history_item_id"), true);
  assertEquals((historyList.params ?? []).some((p) => p.key === "page"), false);
});
