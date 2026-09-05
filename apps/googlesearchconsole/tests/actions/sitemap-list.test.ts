import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sitemap-list.ts";

Deno.test("sitemap-list: lists a site's submitted sitemaps with no sitemapIndex", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sitemap: [{ path: "a.xml" }] } }], {
    display: { siteUrl: "https://www.example.com/" },
  });
  const out = await action.execute!({}, ctx) as { sitemap: unknown[] };
  const url = new URL(calls[0].url);
  assertEquals(
    url.pathname,
    "/webmasters/v3/sites/https%3A%2F%2Fwww.example.com%2F/sitemaps",
  );
  assertEquals(url.searchParams.has("sitemapIndex"), false);
  assertEquals(out.sitemap.length, 1);
});

Deno.test("sitemap-list: passes sitemapIndex to list entries inside an index", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sitemap: [] } }], {
    display: { siteUrl: "https://www.example.com/" },
  });
  await action.execute!({ sitemapIndex: "https://www.example.com/sitemapindex.xml" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("sitemapIndex"), "https://www.example.com/sitemapindex.xml");
});
