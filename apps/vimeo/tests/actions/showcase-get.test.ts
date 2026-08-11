import { assertEquals } from "@std/assert";
import showcaseGet from "../../actions/showcase-get.ts";
import { mockCtx, q, url } from "../_helpers.ts";

const showcase = { uri: "/users/152184/albums/3706071", name: "Holiday Videos", total_clips: 4 };

Deno.test("showcase-get: fetches /me/albums/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: showcase }]);
  const out = await showcaseGet.execute({ showcaseId: "3706071" }, ctx) as typeof showcase;
  assertEquals(url(calls[0]).pathname, "/me/albums/3706071");
  assertEquals(out.total_clips, 4);
});

/**
 * The endpoint path says `albums` but a showcase's own URI says `/showcases/`.
 * Both must reduce to the same id or a pasted URI 404s.
 */
Deno.test("showcase-get: accepts the /showcases/ URI form as well as the /albums/ path form", async () => {
  const { ctx, calls } = mockCtx([{ body: showcase }, { body: showcase }]);
  await showcaseGet.execute({ showcaseId: "/showcases/3706071" }, ctx);
  assertEquals(url(calls[0]).pathname, "/me/albums/3706071");
  await showcaseGet.execute({ showcaseId: "/users/152184/albums/3706071" }, ctx);
  assertEquals(url(calls[1]).pathname, "/me/albums/3706071");
});

Deno.test("showcase-get: forwards the fields filter", async () => {
  const { ctx, calls } = mockCtx([{ body: showcase }]);
  await showcaseGet.execute({ showcaseId: "1", fields: "uri,name" }, ctx);
  assertEquals(q(calls[0], "fields"), "uri,name");
});

Deno.test("showcase-get: is a read action", () => {
  assertEquals(showcaseGet.type, "read");
});
