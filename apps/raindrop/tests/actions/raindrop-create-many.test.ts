import { assert, assertEquals, assertRejects } from "@std/assert";
import raindropCreateMany, { MAX_ITEMS } from "../../actions/raindrop-create-many.ts";
import { bodyOf, items, mockCtx, pathOf } from "../_helpers.ts";

/** Plural path, and the body is `{items: [...]}` — not a bare array. */
Deno.test("raindrop-create-many: POSTs the plural path with an items envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: items([{ _id: 1 }, { _id: 2 }]) }]);
  const out = await raindropCreateMany.execute(
    { items: [{ link: "https://a" }, { link: "https://b" }] },
    ctx,
  ) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/rest/v1/raindrops");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { items: [{ link: "https://a" }, { link: "https://b" }] });
  assertEquals(out.items.length, 2);
});

Deno.test("raindrop-create-many: accepts the array as a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: items([]) }]);
  await raindropCreateMany.execute({ items: '[{"link":"https://a"}]' }, ctx);

  assertEquals(bodyOf(calls[0]), { items: [{ link: "https://a" }] });
});

/** The vendor's own emphasis: "Maximum 100 objects in array!" */
Deno.test("raindrop-create-many: refuses more than 100 items without making a request", async () => {
  assertEquals(MAX_ITEMS, 100);
  const list = Array.from({ length: 101 }, (_, i) => ({ link: `https://e.com/${i}` }));
  const { ctx, calls } = mockCtx([]);

  const err = await assertRejects(
    () => Promise.resolve(raindropCreateMany.execute({ items: list }, ctx)),
    Error,
  );
  assert(err.message.includes("101"), err.message);
  assertEquals(calls.length, 0);
});

/**
 * A batch that silently drops elements is worse than one that refuses, and the
 * message has to say WHICH element is wrong or the caller cannot fix it.
 */
Deno.test("raindrop-create-many: names the index of an item missing its link", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        raindropCreateMany.execute({ items: [{ link: "https://a" }, { title: "no link" }] }, ctx),
      ),
    Error,
  );
  assert(err.message.includes("Items[1]"), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("raindrop-create-many: refuses an empty batch and a non-array", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => Promise.resolve(raindropCreateMany.execute({ items: [] }, ctx)), Error);
  await assertRejects(
    () => Promise.resolve(raindropCreateMany.execute({ items: { link: "x" } }, ctx)),
    Error,
  );
});

Deno.test("raindrop-create-many: is not idempotent", () => {
  assertEquals(raindropCreateMany.idempotent, false);
});
