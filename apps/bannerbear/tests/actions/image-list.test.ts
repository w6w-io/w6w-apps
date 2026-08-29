import { assertEquals } from "@std/assert";
import imageList from "../../actions/image-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("image-list: GET /images with the page query param", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uid: "i1" }] }]);
  const out = await imageList.execute({ page: 3 }, ctx) as unknown[];

  assertEquals(pathOf(calls[0].url), "/images");
  assertEquals(queryOf(calls[0].url), { page: "3" });
  assertEquals(out, [{ uid: "i1" }]);
});
