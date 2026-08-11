import { assertEquals } from "@std/assert";
import photoUpdate from "../../actions/photo-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("photo-update: sets the internal flag through the nested body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "1", internal: true } }]);
  await photoUpdate.execute({ photoId: "1", internal: true }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/photos/1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(bodyOf(calls[0]), { photo: { internal: true } });
});

Deno.test("photo-update: sends false rather than dropping it", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await photoUpdate.execute({ photoId: "1", internal: false }, ctx);
  assertEquals(bodyOf(calls[0]), { photo: { internal: false } });
});

Deno.test("photo-update: offers only what this endpoint documents", () => {
  assertEquals(photoUpdate.params!.map((p) => p.key), ["photoId", "internal"]);
  assertEquals(photoUpdate.idempotent, true);
});
