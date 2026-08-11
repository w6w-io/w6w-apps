import { assertEquals, assertRejects } from "@std/assert";
import photoTagAdd from "../../actions/photo-tag-add.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

/** Photo tags are a flat `{tags: []}`; project labels nest under `project`. */
Deno.test("photo-tag-add: sends a flat tags array of display values", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "1" } }]);
  await photoTagAdd.execute({ photoId: "9", tags: ["Front Side", "Damage"] }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/photos/9/tags");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { tags: ["Front Side", "Damage"] });
});

Deno.test("photo-tag-add: refuses an empty list rather than sending one", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await photoTagAdd.execute({ photoId: "9", tags: "" }, ctx),
    Error,
    "At least one tag",
  );
  assertEquals(calls.length, 0);
});

Deno.test("photo-tag-add: is non-idempotent — no documented de-duplication", () => {
  assertEquals(photoTagAdd.idempotent, false);
});
