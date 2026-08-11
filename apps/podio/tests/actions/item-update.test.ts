import { assertEquals, assertRejects } from "@std/assert";
import itemUpdate from "../../actions/item-update.ts";
import { bodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const UPDATED = { revision: 4, title: "Acme Ltd" };

Deno.test("item-update: PUTs the fields map to the item", async () => {
  const { ctx, calls } = mockCtx([{ body: UPDATED }]);
  const out = await itemUpdate.execute({ itemId: "9", fields: { title: "Acme Ltd" } }, ctx);
  assertEquals(out, { revision: 4, title: "Acme Ltd" });
  assertEquals(pathOf(calls[0].url), "/item/9");
  assertEquals(calls[0].method, "PUT");
  assertEquals(bodyOf(calls[0]), { fields: { title: "Acme Ltd" } });
});

/**
 * Podio: "To delete all values for a field supply an empty array as values for
 * that field." An empty array is a value, so it must survive to the wire.
 */
Deno.test("item-update: an empty array survives, because that is how Podio clears a field", async () => {
  const { ctx, calls } = mockCtx([{ body: UPDATED }]);
  await itemUpdate.execute({ itemId: "9", fields: { notes: [] } }, ctx);
  assertEquals(bodyOf(calls[0]), { fields: { notes: [] } });
});

/**
 * The revision guard is what turns last-writer-wins into a 409 a workflow can
 * handle. `revision: 0` is a legal revision and must not be dropped.
 */
Deno.test("item-update: the revision guard is sent, including revision 0", async () => {
  const four = mockCtx([{ body: UPDATED }]);
  await itemUpdate.execute({ itemId: "9", fields: { a: 1 }, revision: 4 }, four.ctx);
  assertEquals(bodyOf(four.calls[0]).revision, 4);

  const zero = mockCtx([{ body: UPDATED }]);
  await itemUpdate.execute({ itemId: "9", fields: { a: 1 }, revision: 0 }, zero.ctx);
  assertEquals(bodyOf(zero.calls[0]).revision, 0);
});

Deno.test("item-update: a 409 surfaces with the conflict explained", async () => {
  const { ctx } = mockCtx([{
    status: 409,
    body: { error: "conflict", error_description: "revision_conflict" },
  }]);
  const error = await assertRejects(
    () => Promise.resolve(itemUpdate.execute({ itemId: "9", fields: { a: 1 }, revision: 1 }, ctx)),
    Error,
  );
  assertEquals(error.message.includes("409"), true);
  assertEquals(error.message.includes("the item changed since the revision you supplied"), true);
});

Deno.test("item-update: optional body fields map to their snake_case names", async () => {
  const { ctx, calls } = mockCtx([{ body: UPDATED }]);
  await itemUpdate.execute({
    itemId: "9",
    fields: { a: 1 },
    externalId: "crm-88",
    tags: ["x"],
    fileIds: [1, 2],
  }, ctx);
  assertEquals(bodyOf(calls[0]), {
    fields: { a: 1 },
    external_id: "crm-88",
    tags: ["x"],
    file_ids: [1, 2],
  });
});

Deno.test("item-update: the webhook and stream switches reach the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: UPDATED }]);
  await itemUpdate.execute({ itemId: "9", fields: { a: 1 }, hook: false }, ctx);
  assertEquals(queryOf(calls[0].url), { hook: "false" });
});

Deno.test("item-update: an array of fields is refused before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(itemUpdate.execute({ itemId: "9", fields: "[]" }, ctx)),
    Error,
    "must be a JSON object",
  );
  assertEquals(calls.length, 0);
});

/** The end state converges, so a dropped connection may safely be retried. */
Deno.test("item-update: is declared idempotent", () => {
  assertEquals(itemUpdate.idempotent, true);
  assertEquals(itemUpdate.type, "perform");
});
