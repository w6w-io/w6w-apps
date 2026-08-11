import { assert, assertEquals } from "@std/assert";
import collectionCreate from "../../actions/collection-create.ts";
import { bodyOf, item, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("collection-create: POSTs the singular path with a title", async () => {
  const { ctx, calls } = mockCtx([{ body: item({ _id: 1, title: "Reading" }) }]);
  const out = await collectionCreate.execute({ title: "Reading" }, ctx) as { item: unknown };

  assertEquals(pathOf(calls[0].url), "/rest/v1/collection");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { title: "Reading" });
  assertEquals(out.item, { _id: 1, title: "Reading" });
});

/** Nesting is `parent.$id`; the flat `parentId` in the form maps onto it here. */
Deno.test("collection-create: parentId becomes parent.$id", async () => {
  const { ctx, calls } = mockCtx([{ body: item({ _id: 2 }) }]);
  await collectionCreate.execute({ title: "Sub", parentId: 8492393 }, ctx);

  assertEquals(bodyOf(calls[0]), { title: "Sub", parent: { $id: 8492393 } });
});

/** `cover` is an array in the API "due to legacy reasons", always of length 1. */
Deno.test("collection-create: a single cover URL is wrapped in the legacy array", async () => {
  const { ctx, calls } = mockCtx([{ body: item({ _id: 3 }) }]);
  await collectionCreate.execute({ title: "C", cover: "https://up.raindrop.io/x.png" }, ctx);

  assertEquals(bodyOf(calls[0]).cover, ["https://up.raindrop.io/x.png"]);
});

/**
 * `public: false` must reach the wire. It is the value someone uses this action
 * to set, and a falsy-drop would silently leave a collection public.
 */
Deno.test("collection-create: public:false is sent, not dropped as falsy", async () => {
  const { ctx, calls } = mockCtx([{ body: item({ _id: 4 }) }]);
  await collectionCreate.execute({ title: "C", public: false }, ctx);

  assertEquals(bodyOf(calls[0]).public, false);
});

/**
 * Raindrop accepts no idempotency key and does not deduplicate on title, so a
 * replay makes a second collection.
 */
Deno.test("collection-create: is not idempotent", () => {
  assertEquals(collectionCreate.idempotent, false);
});

/** The one-checkbox data exposure deserves to be named in the form, not buried. */
Deno.test("collection-create: the public flag's hint says what it exposes", () => {
  const hint = collectionCreate.params?.find((p) => p.key === "public")?.hint ?? "";
  assert(/no authentication/i.test(hint), hint);
});
