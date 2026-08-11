import { assertEquals, assertRejects } from "@std/assert";
import raindropSuggest from "../../actions/raindrop-suggest.ts";
import { bodyOf, item, mockCtx, pathOf } from "../_helpers.ts";

const SUGGESTION = { collections: [{ $id: 568368 }], tags: ["fonts", "free"] };

/** An unsaved URL goes to POST /raindrop/suggest with the link in the body. */
Deno.test("raindrop-suggest: a URL POSTs to /raindrop/suggest", async () => {
  const { ctx, calls } = mockCtx([{ body: item(SUGGESTION) }]);
  const out = await raindropSuggest.execute({ link: "https://example.com" }, ctx) as {
    collections: unknown[];
    tags: string[];
  };

  assertEquals(pathOf(calls[0].url), "/rest/v1/raindrop/suggest");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { link: "https://example.com" });
  assertEquals(out, SUGGESTION);
});

/** An existing bookmark is a GET on a different path entirely. */
Deno.test("raindrop-suggest: a raindrop ID GETs /raindrop/{id}/suggest", async () => {
  const { ctx, calls } = mockCtx([{ body: item(SUGGESTION) }]);
  await raindropSuggest.execute({ raindropId: 373777232 }, ctx);

  assertEquals(pathOf(calls[0].url), "/rest/v1/raindrop/373777232/suggest");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
});

/**
 * Both inputs is a request the API has no way to reconcile, so it is refused
 * rather than resolved by an invisible precedence rule.
 */
Deno.test("raindrop-suggest: refuses both inputs, and neither, without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(raindropSuggest.execute({ link: "https://x", raindropId: 1 }, ctx)),
    Error,
  );
  await assertRejects(() => Promise.resolve(raindropSuggest.execute({}, ctx)), Error);
  assertEquals(calls.length, 0);
});

Deno.test("raindrop-suggest: a response with neither key yields empty arrays", async () => {
  const { ctx } = mockCtx([{ body: item({}) }]);
  assertEquals(await raindropSuggest.execute({ link: "https://x" }, ctx), {
    collections: [],
    tags: [],
  });
});

/** It creates nothing, whatever verb the vendor picked. */
Deno.test("raindrop-suggest: is typed read despite the POST", () => {
  assertEquals(raindropSuggest.type, "read");
  assertEquals(raindropSuggest.idempotent, undefined);
});
