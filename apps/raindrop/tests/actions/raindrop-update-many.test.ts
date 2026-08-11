import { assert, assertEquals, assertRejects } from "@std/assert";
import raindropUpdateMany from "../../actions/raindrop-update-many.ts";
import { bodyOf, mockCtx, okBody, pathOf, queryOf } from "../_helpers.ts";

Deno.test("raindrop-update-many: PUTs the plural path with ids in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ modified: 2 }) }]);
  const out = await raindropUpdateMany.execute(
    { collectionId: 8492393, ids: "1, 2", important: true },
    ctx,
  ) as { modified: number; result: boolean };

  assertEquals(pathOf(calls[0].url), "/rest/v1/raindrops/8492393");
  assertEquals(calls[0].method, "PUT");
  assertEquals(bodyOf(calls[0]), { ids: [1, 2], important: true });
  assertEquals(out, { modified: 2, result: true });
});

/**
 * **Collection 0 is refused.** The vendor's own warning: "update or remove
 * methods not support `0` yet." The read path accepts it, which is exactly why a
 * caller reaches for it here — and why the refusal has to happen before the
 * request, not after an ambiguous response.
 */
Deno.test("raindrop-update-many: refuses collection 0 without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () => Promise.resolve(raindropUpdateMany.execute({ collectionId: 0, important: true }, ctx)),
    Error,
  );
  assert(err.message.includes("does not support collection 0"), err.message);
  assertEquals(calls.length, 0);
});

/** -1 and -99 are supported by the update path; only 0 is not. */
Deno.test("raindrop-update-many: the negative system collections are allowed", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody() }]);
  await raindropUpdateMany.execute({ collectionId: -1, important: false }, ctx);
  assertEquals(pathOf(calls[0].url), "/rest/v1/raindrops/-1");
});

/**
 * **`tags` APPENDS here** — the same field replaces on the single-raindrop path.
 * And `[]` is a third meaning: erase every tag. The erase is a separate explicit
 * toggle so that "leave the field blank" and "send an empty array" can never be
 * the same gesture.
 */
Deno.test("raindrop-update-many: tags append, and the erase toggle sends an empty array", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody() }, { body: okBody() }]);
  await raindropUpdateMany.execute({ collectionId: 1, tags: "a, b" }, ctx);
  await raindropUpdateMany.execute({ collectionId: 1, tags: "a", removeAllTags: true }, ctx);

  assertEquals(bodyOf(calls[0]).tags, ["a", "b"]);
  // The toggle wins over the tag list — otherwise "erase" would silently add.
  assertEquals(bodyOf(calls[1]).tags, []);
  assert(/APPENDED/.test(raindropUpdateMany.description ?? ""), raindropUpdateMany.description);
});

Deno.test("raindrop-update-many: moveToCollectionId becomes collection.$id", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody() }]);
  await raindropUpdateMany.execute({ collectionId: 1, moveToCollectionId: -1 }, ctx);

  assertEquals(bodyOf(calls[0]), { collection: { $id: -1 } });
});

Deno.test("raindrop-update-many: search goes in the query string, ids in the body", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody() }]);
  await raindropUpdateMany.execute(
    { collectionId: 1, search: "#work", nested: true, important: true },
    ctx,
  );

  assertEquals(queryOf(calls[0].url), { search: "#work", nested: "true" });
  assertEquals(bodyOf(calls[0]), { important: true });
});

/**
 * With no ids and no search this endpoint updates every bookmark in the
 * collection, so an action carrying only a selection and no change would be an
 * account-scale no-op request. Refuse it rather than send it.
 */
Deno.test("raindrop-update-many: refuses a request that changes nothing", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(raindropUpdateMany.execute({ collectionId: 1, ids: "1,2" }, ctx)),
    Error,
  );
  assertEquals(calls.length, 0);
});

/** The empty-selection hazard must be stated where a user fills the field. */
Deno.test("raindrop-update-many: the ids hint warns that empty means everything", () => {
  const hint = raindropUpdateMany.params?.find((p) => p.key === "ids")?.hint ?? "";
  assert(/EVERY BOOKMARK/i.test(hint), hint);
});

Deno.test("raindrop-update-many: is not idempotent", () => {
  assertEquals(raindropUpdateMany.idempotent, false);
});
