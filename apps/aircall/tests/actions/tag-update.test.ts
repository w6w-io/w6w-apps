import { assert, assertEquals, assertRejects } from "@std/assert";
import tagUpdate from "../../actions/tag-update.ts";
import { bodyOf, entityBody, mockCtx, pathOf } from "../_helpers.ts";

/** A PUT, unlike Update Contact's POST. */
Deno.test("tag-update: PUTs /v1/tags/{id} with only the supplied fields", async () => {
  const { ctx, calls } = mockCtx([
    { body: entityBody("tag", { id: 681, name: "Tier 2 Customer" }) },
  ]);
  await tagUpdate.execute({ tagId: "681", name: "Tier 2 Customer" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/tags/681");
  // The vendor's own worked example sends `name` alone, despite its body table
  // marking `color` mandatory.
  assertEquals(bodyOf(calls[0]), { name: "Tier 2 Customer" });
});

Deno.test("tag-update: an empty change set is rejected before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () => Promise.resolve(tagUpdate.execute({ tagId: "681" }, ctx)),
    Error,
  );
  assert(err.message.includes("name, a colour, or both"), err.message);
  assertEquals(calls.length, 0);
});
