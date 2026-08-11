import { assertEquals } from "@std/assert";
import voiceList from "../../actions/voice-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const PAGE = {
  voices: [{ voice_id: "v1", name: "Roger" }],
  has_more: true,
  total_count: 42,
  next_page_token: "tok",
};

/**
 * v2, not v1: `/v1/voices` answers 200 to a request with no credential at all
 * (102,976 bytes, measured 2026-08-11), so it can neither be this list nor the
 * health probe.
 */
Deno.test("voice-list: reads /v2/voices, the credential-gated paged endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const out = await voiceList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/voices");
  assertEquals(out, PAGE);
});

Deno.test("voice-list: filters and paging reach the query", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await voiceList.execute({
    search: "narrator",
    voiceType: "personal",
    category: "cloned",
    pageSize: 50,
    nextPageToken: "tok",
    sort: "name",
    sortDirection: "asc",
    language: "en",
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    search: "narrator",
    voice_type: "personal",
    category: "cloned",
    page_size: "50",
    next_page_token: "tok",
    sort: "name",
    sort_direction: "asc",
    language: "en",
  });
});

/** `include_total_count` defaults to true server-side; only the opt-out travels. */
Deno.test("voice-list: the total-count flag is only sent when turned off", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }, { body: PAGE }]);
  await voiceList.execute({ includeTotalCount: true }, ctx);
  assertEquals(queryOf(calls[0].url), {});
  await voiceList.execute({ includeTotalCount: false }, ctx);
  assertEquals(queryOf(calls[1].url), { include_total_count: "false" });
});

/** The vendor caps page_size at 100 and its own default (10) is uselessly small. */
Deno.test("voice-list: page size is capped at the documented 100", () => {
  const size = (voiceList.params ?? []).find((p) => p.key === "pageSize");
  assertEquals(size?.validation?.max, 100);
  assertEquals(size?.default, 30);
});

Deno.test("voice-list: the output names has_more and next_page_token, the paging contract", () => {
  const keys = (voiceList.output as Array<{ key: string }>).map((o) => o.key);
  assertEquals(keys.includes("has_more"), true);
  assertEquals(keys.includes("next_page_token"), true);
});
