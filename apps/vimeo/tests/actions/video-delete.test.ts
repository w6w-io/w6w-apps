import { assertEquals, assertRejects } from "@std/assert";
import videoDelete from "../../actions/video-delete.ts";
import { errorBody, mockCtx, url } from "../_helpers.ts";

Deno.test("video-delete: DELETEs /videos/{id} and reports the 204 as a result", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await videoDelete.execute({ videoId: "/videos/258684937" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url(calls[0]).pathname, "/videos/258684937");
  assertEquals(out, { deleted: true, videoId: "258684937" });
});

/** `fields` is documented as unsupported on DELETE, so none is offered or sent. */
Deno.test("video-delete: sends no query at all", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await videoDelete.execute({ videoId: "1" }, ctx);
  assertEquals(url(calls[0]).search, "");
  assertEquals((videoDelete.params ?? []).map((p) => p.key), ["videoId"]);
});

Deno.test("video-delete: a 403 surfaces rather than reporting a false success", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(3200, "Not the owner.") }]);
  await assertRejects(
    async () => await videoDelete.execute({ videoId: "1" }, ctx),
    Error,
    "403",
  );
});

Deno.test("video-delete: is a retry-safe perform", () => {
  assertEquals(videoDelete.type, "perform");
  assertEquals(videoDelete.idempotent, true);
});
