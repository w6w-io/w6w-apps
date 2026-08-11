import { assertEquals, assertRejects } from "@std/assert";
import urlExists from "../../actions/url-exists.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("url-exists: POSTs the urls and reports the matching ids", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: true, ids: [3322, 12323] } }]);
  const out = await urlExists.execute({ urls: "https://a, https://b" }, ctx) as {
    ids: number[];
    found: boolean;
  };

  assertEquals(pathOf(calls[0].url), "/rest/v1/import/url/exists");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { urls: ["https://a", "https://b"] });
  assertEquals(out, { ids: [3322, 12323], found: true });
});

/**
 * **The finding this action exists to survive.** A completely successful "none
 * of these URLs is saved" arrives as `{"result": false, "ids": []}`. The shared
 * `ok()` path throws on `result: false`, so this action reads the body with
 * `json()` — and reports `found` from the `ids` array, which is unambiguous,
 * never from the flag.
 */
Deno.test('url-exists: result:false means "none found", not a failure', async () => {
  const { ctx } = mockCtx([{ body: { result: false, ids: [] } }]);
  const out = await urlExists.execute({ urls: "https://nowhere" }, ctx) as {
    ids: number[];
    found: boolean;
  };

  assertEquals(out, { ids: [], found: false });
});

/** And the converse: a `result: false` carrying ids still reports them found. */
Deno.test("url-exists: `found` is derived from ids, not from the result flag", async () => {
  const { ctx } = mockCtx([{ body: { result: false, ids: [7] } }]);
  const out = await urlExists.execute({ urls: "https://a" }, ctx) as { found: boolean };

  assertEquals(out.found, true);
});

Deno.test("url-exists: refuses an empty url list without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => Promise.resolve(urlExists.execute({ urls: "" }, ctx)), Error);
  assertEquals(calls.length, 0);
});
