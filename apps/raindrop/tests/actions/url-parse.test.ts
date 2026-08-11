import { assertEquals, assertRejects } from "@std/assert";
import urlParse from "../../actions/url-parse.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("url-parse: GETs /import/url/parse with the url as a query parameter", async () => {
  const { ctx, calls } = mockCtx([
    { body: { result: true, item: { title: "Example", type: "link" } } },
  ]);
  const out = await urlParse.execute({ url: "https://example.com" }, ctx) as {
    item: unknown;
    parseError?: string;
  };

  assertEquals(pathOf(calls[0].url), "/rest/v1/import/url/parse");
  assertEquals(queryOf(calls[0].url), { url: "https://example.com" });
  assertEquals(out.item, { title: "Example", type: "link" });
  assertEquals(out.parseError, undefined);
});

/**
 * **The finding.** A page this endpoint could not read comes back as
 * `result: true` WITH an `error` field and a best-effort `item`. That is the
 * vendor saying "here is the best I could do"; throwing on it would turn "that
 * page is down" into a failed workflow run.
 */
Deno.test("url-parse: an unreachable page is data, not a thrown error", async () => {
  const { ctx } = mockCtx([{
    body: {
      error: "not_found",
      errorMessage: "url_status_404",
      item: { title: "Some", type: "link", parser: "local" },
      result: true,
    },
  }]);
  const out = await urlParse.execute({ url: "https://example.com/gone" }, ctx) as {
    item: Record<string, unknown>;
    parseError?: string;
    parseErrorMessage?: string;
  };

  assertEquals(out.parseError, "not_found");
  assertEquals(out.parseErrorMessage, "url_status_404");
  // The fallback item is still returned — that is the point of not throwing.
  assertEquals(out.item.parser, "local");
});

/** The invalid-URL variant of the same shape. */
Deno.test("url-parse: an invalid URL also returns an item plus the error code", async () => {
  const { ctx } = mockCtx([{
    body: {
      error: "not_found",
      errorMessage: "invalid_url",
      item: { title: "Fdfdfdf" },
      result: true,
    },
  }]);
  const out = await urlParse.execute({ url: "Fdfdfdf" }, ctx) as { parseErrorMessage?: string };

  assertEquals(out.parseErrorMessage, "invalid_url");
});

Deno.test("url-parse: refuses an empty url without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => Promise.resolve(urlParse.execute({ url: "  " }, ctx)), Error);
  assertEquals(calls.length, 0);
});
