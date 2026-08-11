import { assertEquals } from "@std/assert";
import likeAdd from "../../actions/like-add.ts";
import { mockCtx, url } from "../_helpers.ts";

/** A PUT: liking is a set-membership assertion, so twice leaves exactly one like. */
Deno.test("like-add: PUTs /me/likes/{id} with no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await likeAdd.execute({ videoId: "/videos/258684937" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(url(calls[0]).pathname, "/me/likes/258684937");
  assertEquals(calls[0].body, null);
  assertEquals(out, { liked: true, videoId: "258684937" });
});

Deno.test("like-add: is a convergent perform", () => {
  assertEquals(likeAdd.type, "perform");
  assertEquals(likeAdd.idempotent, true);
});
