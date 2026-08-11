import { assertEquals } from "@std/assert";
import collectionUpdate from "../../actions/collection-update.ts";
import { bodyOf, item, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("collection-update: PUTs the singular path", async () => {
  const { ctx, calls } = mockCtx([{ body: item({ _id: 8492393, title: "Renamed" }) }]);
  const out = await collectionUpdate.execute({ id: 8492393, title: "Renamed" }, ctx) as {
    item: unknown;
  };

  assertEquals(pathOf(calls[0].url), "/rest/v1/collection/8492393");
  assertEquals(calls[0].method, "PUT");
  assertEquals(bodyOf(calls[0]), { title: "Renamed" });
  assertEquals(out.item, { _id: 8492393, title: "Renamed" });
});

/** Partial: an unset field must not reach the wire as `null` or `""`. */
Deno.test("collection-update: omitted fields are absent from the body", async () => {
  const { ctx, calls } = mockCtx([{ body: item({ _id: 1 }) }]);
  await collectionUpdate.execute({ id: 1, view: "grid" }, ctx);

  assertEquals(bodyOf(calls[0]), { view: "grid" });
});

/**
 * Both booleans must survive as `false`: "make this private" and "collapse this"
 * are exactly what the action is for, and a falsy-drop would turn either into a
 * no-op that reports success.
 */
Deno.test("collection-update: public:false and expanded:false are sent", async () => {
  const { ctx, calls } = mockCtx([{ body: item({ _id: 1 }) }]);
  await collectionUpdate.execute({ id: 1, public: false, expanded: false }, ctx);

  assertEquals(bodyOf(calls[0]), { public: false, expanded: false });
});

Deno.test("collection-update: parentId becomes parent.$id", async () => {
  const { ctx, calls } = mockCtx([{ body: item({ _id: 1 }) }]);
  await collectionUpdate.execute({ id: 1, parentId: 42 }, ctx);

  assertEquals(bodyOf(calls[0]), { parent: { $id: 42 } });
});

/** A partial update replayed produces the same end state. */
Deno.test("collection-update: is idempotent", () => {
  assertEquals(collectionUpdate.idempotent, true);
});
