import { assertEquals } from "@std/assert";
import likeRemove from "../../actions/like-remove.ts";
import { mockCtx, url } from "../_helpers.ts";

Deno.test("like-remove: DELETEs /me/likes/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await likeRemove.execute({ videoId: "258684937" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url(calls[0]).pathname, "/me/likes/258684937");
  assertEquals(out, { unliked: true, videoId: "258684937" });
});

Deno.test("like-remove: is a convergent perform", () => {
  assertEquals(likeRemove.type, "perform");
  assertEquals(likeRemove.idempotent, true);
});
