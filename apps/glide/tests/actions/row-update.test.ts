import { assertEquals, assertThrows } from "@std/assert";
import rowUpdate from "../../actions/row-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("row-update: PATCHes field values verbatim, including explicit nulls", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await rowUpdate.execute(
    { tableId: "t1", rowId: "r1", fields: { totalAmount: 40, notes: null } },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/tables/t1/rows/r1");
  assertEquals(calls[0].method, "PATCH");
  // Explicit null must survive: it is how a Glide field is cleared.
  assertEquals(JSON.parse(calls[0].body!), { totalAmount: 40, notes: null });
});

Deno.test("row-update: forwards a valid If-Match, rejects a malformed one before the request", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await rowUpdate.execute({ tableId: "t1", rowId: "r1", fields: {}, ifMatch: '"3"' }, ctx);
  assertEquals(calls[0].headers["if-match"], '"3"');

  assertThrows(() =>
    rowUpdate.execute({ tableId: "t1", rowId: "r1", fields: {}, ifMatch: "3" }, ctx)
  );
});

Deno.test("row-update: marked idempotent — explicit field values converge", () => {
  assertEquals(rowUpdate.idempotent, true);
});
