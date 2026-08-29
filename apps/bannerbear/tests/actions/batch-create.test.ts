import { assertEquals } from "@std/assert";
import batchCreate from "../../actions/batch-create.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("batch-create: POST /batches with type images and the given items", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { uid: "b1", total: 2 } }]);
  const items = [{ template: "t1", modifications: {} }, { template: "t1", modifications: {} }];
  const out = await batchCreate.execute({ items: JSON.stringify(items) }, ctx) as unknown as Record<
    string,
    unknown
  >;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/batches");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { type: "images", items });
  assertEquals(out.total, 2);
});

Deno.test("batch-create: rejects an empty items array", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => batchCreate.execute({ items: "[]" }, ctx));
});

Deno.test("batch-create: rejects more than 100 items", async () => {
  const { ctx } = mockCtx([]);
  const items = Array.from({ length: 101 }, () => ({ template: "t1", modifications: {} }));
  await assertRejects(() => batchCreate.execute({ items }, ctx));
});
