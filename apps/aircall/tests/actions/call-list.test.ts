import { assert, assertEquals } from "@std/assert";
import callList from "../../actions/call-list.ts";
import { listBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("call-list: calls GET /v1/calls and projects meta into the result", async () => {
  const { ctx, calls } = mockCtx([
    { body: listBody("calls", [{ id: 812 }, { id: 813 }], { total: 2234, next_page_link: null }) },
  ]);
  const out = await callList.execute({}, ctx) as {
    items: unknown[];
    count: number;
    total: number;
    hasMore: boolean;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/calls");
  assertEquals(out.items.length, 2);
  assertEquals(out.total, 2234);
  assertEquals(out.hasMore, false);
});

/**
 * `hasMore` is derived from `next_page_link`, NOT from `count < total`: Calls
 * cap at 10,000 reachable records while `total` keeps counting, so comparing the
 * two promises pages the API will refuse to serve.
 */
Deno.test("call-list: hasMore follows next_page_link, not count vs total", async () => {
  const { ctx } = mockCtx([
    {
      body: listBody("calls", [{ id: 1 }], {
        count: 1,
        total: 999999,
        next_page_link: null,
      }),
    },
  ]);
  const out = await callList.execute({}, ctx) as { hasMore: boolean; total: number };
  assertEquals(out.total, 999999);
  assertEquals(out.hasMore, false, "a huge total must not imply another page");
});

Deno.test("call-list: window, pagination and expansion params reach the query", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody("calls", []) }]);
  await callList.execute({
    from: "1584998199",
    to: "1584998210",
    order: "desc",
    page: 3,
    perPage: 50,
    fetchContact: true,
    fetchShortUrls: true,
    fetchCallTimeline: true,
    fetchAivaConv: true,
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    from: "1584998199",
    to: "1584998210",
    order: "desc",
    page: "3",
    per_page: "50",
    fetch_contact: "true",
    fetch_short_urls: "true",
    fetch_call_timeline: "true",
    fetch_aiva_conv: "true",
  });
});

/**
 * Aircall documents these flags only as "when set to true" and says nothing
 * about how a false is parsed, so a false must be absence rather than
 * `?fetch_contact=false`.
 */
Deno.test("call-list: a false expansion flag is omitted, not sent as false", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody("calls", []) }]);
  await callList.execute({ fetchContact: false, fetchShortUrls: false }, ctx);
  const q = queryOf(calls[0].url);
  assert(!("fetch_contact" in q), `fetch_contact leaked: ${JSON.stringify(q)}`);
  assert(!("fetch_short_urls" in q), `fetch_short_urls leaked: ${JSON.stringify(q)}`);
});
