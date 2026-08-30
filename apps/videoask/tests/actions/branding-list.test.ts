import { assertEquals } from "@std/assert";
import brandingList from "../../actions/branding-list.ts";
import { mockCtx, page, pathOf } from "../_helpers.ts";

Deno.test("branding-list: GETs /brandings and unwraps the page envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: page([{ branding_id: "b1", name: "Brand 1" }], { count: 1 }),
  }]);
  const out = await brandingList.execute({}, ctx) as { count: number; results: unknown[] };
  assertEquals(pathOf(calls[0].url), "/brandings");
  assertEquals(out.count, 1);
});
