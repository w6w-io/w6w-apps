import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const RSS_HEADERS = { "content-type": "application/rss+xml; charset=utf-8" };

function rss(items: Array<{ title: string; pubDate: string }>): string {
  const body = items.map((i) =>
    `<item><title>${i.title}</title><pubDate>${i.pubDate}</pubDate></item>`
  )
    .join("");
  return `<?xml version="1.0"?><rss version="2.0"><channel>${body}</channel></rss>`;
}

Deno.test('service: reports ok from the newest "Wati API" item', async () => {
  const { ctx } = mockCtx([{
    status: 200,
    headers: RSS_HEADERS,
    body: rss([
      { title: "Wati API - Operational", pubDate: "Fri, 09 Jan 2026 16:20:56 +0800" },
      { title: "Analytics - Operational", pubDate: "Wed, 02 Sep 2026 14:10:10 +0800" },
    ]),
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
});

Deno.test('service: reads the NEWEST "Wati API" entry even when an older one shares a guid-batch with other components', async () => {
  const { ctx } = mockCtx([{
    status: 200,
    headers: RSS_HEADERS,
    body: rss([
      { title: "Wati API - Operational", pubDate: "Fri, 09 Jan 2026 16:20:56 +0800" },
      { title: "Analytics - Major Outage", pubDate: "Fri, 09 Jan 2026 16:20:56 +0800" },
      { title: "Wati API - Major Outage", pubDate: "Wed, 02 Sep 2026 14:10:10 +0800" },
    ]),
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
  assert(out.message?.includes("Wati API"), out.message);
});

Deno.test('service: unknown when the "Wati API" component is no longer published', async () => {
  const { ctx } = mockCtx([{
    status: 200,
    headers: RSS_HEADERS,
    body: rss([{ title: "Billing - Operational", pubDate: "Wed, 02 Sep 2026 14:10:10 +0800" }]),
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("service: unknown when status.wati.io is unreachable", async () => {
  const { ctx } = mockCtx([]); // empty queue — mockCtx throws on the fetch attempt
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("service: unknown on a non-2xx from the status host", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});
