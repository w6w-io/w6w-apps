import { assertEquals, assertRejects } from "@std/assert";
import raindropCreate from "../../actions/raindrop-create.ts";
import { bodyOf, item, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("raindrop-create: POSTs the singular path with just a link", async () => {
  const { ctx, calls } = mockCtx([{ body: item({ _id: 1, link: "https://example.com" }) }]);
  const out = await raindropCreate.execute({ link: "https://example.com" }, ctx) as {
    item: unknown;
  };

  assertEquals(pathOf(calls[0].url), "/rest/v1/raindrop");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { link: "https://example.com" });
  assertEquals(out.item, { _id: 1, link: "https://example.com" });
});

/** `collectionId` in the form is `collection.$id` on the wire. */
Deno.test("raindrop-create: collectionId becomes collection.$id", async () => {
  const { ctx, calls } = mockCtx([{ body: item({ _id: 1 }) }]);
  await raindropCreate.execute({ link: "https://x", collectionId: -1 }, ctx);

  assertEquals(bodyOf(calls[0]), { link: "https://x", collection: { $id: -1 } });
});

/**
 * `pleaseParse` is a presence-of-empty-object flag, not a boolean. Sending
 * `true` would be a type the vendor does not document; sending `false` would
 * rely on the API reading a boolean where it looks for an object.
 */
Deno.test("raindrop-create: pleaseParse:true becomes an empty object, false is absent", async () => {
  const { ctx, calls } = mockCtx([{ body: item({}) }, { body: item({}) }]);
  await raindropCreate.execute({ link: "https://x", pleaseParse: true }, ctx);
  await raindropCreate.execute({ link: "https://x", pleaseParse: false }, ctx);

  assertEquals(bodyOf(calls[0]).pleaseParse, {});
  assertEquals("pleaseParse" in bodyOf(calls[1]), false);
});

Deno.test("raindrop-create: comma-separated tags become an array", async () => {
  const { ctx, calls } = mockCtx([{ body: item({}) }]);
  await raindropCreate.execute({ link: "https://x", tags: "a, b" }, ctx);

  assertEquals(bodyOf(calls[0]).tags, ["a", "b"]);
});

Deno.test("raindrop-create: refuses an empty link without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => Promise.resolve(raindropCreate.execute({ link: "" }, ctx)), Error);
  assertEquals(calls.length, 0);
});

/**
 * Raindrop does not deduplicate on `link` — its duplicate detection is a report,
 * not a constraint — and accepts no idempotency key, so a replay makes a second
 * bookmark.
 */
Deno.test("raindrop-create: is not idempotent", () => {
  assertEquals(raindropCreate.idempotent, false);
});

/**
 * `reminder` is deliberately absent: the reference spells the sub-field
 * `reminder.data` in its only mention of it, which reads like a typo for `date`
 * and cannot be settled from any second source. A wrong key would be swallowed
 * silently and the reminder would never fire.
 */
Deno.test("raindrop-create: exposes no reminder field", () => {
  assertEquals(raindropCreate.params?.some((p) => /reminder/i.test(p.key)), false);
});
