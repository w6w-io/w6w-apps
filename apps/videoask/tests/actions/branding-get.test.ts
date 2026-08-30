import { assertEquals } from "@std/assert";
import brandingGet from "../../actions/branding-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("branding-get: GETs /brandings/{brandingId} and wraps it as {result}", async () => {
  const { ctx, calls } = mockCtx([{ body: { branding_id: "b1", name: "Brand 1" } }]);
  const out = await brandingGet.execute({ brandingId: "b1" }, ctx) as { result: { name: string } };
  assertEquals(pathOf(calls[0].url), "/brandings/b1");
  assertEquals(out.result.name, "Brand 1");
});
