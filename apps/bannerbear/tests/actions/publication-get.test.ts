import { assertEquals } from "@std/assert";
import publicationGet from "../../actions/publication-get.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("publication-get: GET /publications/{uid}", async () => {
  const { ctx, calls } = mockCtx([{ body: { uid: "p1", install_count: 5 } }]);
  const out = await publicationGet.execute({ uid: "p1" }, ctx) as unknown as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/publications/p1");
  assertEquals(out.install_count, 5);
});

Deno.test("publication-get: requires uid", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => publicationGet.execute({ uid: "" }, ctx));
});
