import { assertEquals, assertRejects } from "@std/assert";
import datasetItemsPush from "../../actions/dataset-items-push.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("dataset-items-push: POSTs the items array as the JSON body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  const out = await datasetItemsPush.execute(
    { datasetId: "d1", items: [{ a: 1 }, { a: 2 }] },
    ctx,
  ) as { itemCount: number; status: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/datasets/d1/items");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), [{ a: 1 }, { a: 2 }]);
  assertEquals(out.itemCount, 2);
  assertEquals(out.status, 201);
});

Deno.test("dataset-items-push: a single object counts as one item", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  const out = await datasetItemsPush.execute({ datasetId: "d1", items: { a: 1 } }, ctx) as {
    itemCount: number;
  };
  assertEquals(JSON.parse(calls[0].body!), { a: 1 });
  assertEquals(out.itemCount, 1);
});

Deno.test("dataset-items-push: items typed as a JSON string are parsed first", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await datasetItemsPush.execute({ datasetId: "d1", items: '[{"a":1}]' }, ctx);
  assertEquals(JSON.parse(calls[0].body!), [{ a: 1 }]);
});

Deno.test("dataset-items-push: missing items fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(datasetItemsPush.execute({ datasetId: "d1", items: undefined }, ctx)),
    Error,
    "Items is required",
  );
  assertEquals(calls.length, 0);
});

/**
 * Schema validation is all-or-nothing: "the whole request is discarded" with a
 * 400. Surfacing the vendor's message is what tells the author which field.
 */
Deno.test("dataset-items-push: a schema rejection surfaces Apify's message", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: errorBody("invalid-value", "Invalid value provided: Comments required") },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(datasetItemsPush.execute({ datasetId: "d1", items: [{}] }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("Comments required"), true, err.message);
});

/** Datasets are append-only — a retry appends a second copy. */
Deno.test("dataset-items-push: is declared non-idempotent", () => {
  assertEquals(datasetItemsPush.idempotent, false);
});
