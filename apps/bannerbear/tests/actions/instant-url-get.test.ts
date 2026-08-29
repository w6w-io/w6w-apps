import { assertEquals } from "@std/assert";
import instantUrlGet from "../../actions/instant-url-get.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("instant-url-get: GET /instant_urls/{uid}", async () => {
  const { ctx, calls } = mockCtx([{ body: { uid: "iu1", render_count: 42 } }]);
  const out = await instantUrlGet.execute({ uid: "iu1" }, ctx) as unknown as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/instant_urls/iu1");
  assertEquals(out.render_count, 42);
});

Deno.test("instant-url-get: requires uid", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => instantUrlGet.execute({ uid: "" }, ctx));
});
