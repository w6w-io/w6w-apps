import { assertEquals } from "@std/assert";
import sectionGet from "../../actions/section-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("section-get: GET /sections/:id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 119, name: "Intermediate" } }]);
  const out = await sectionGet.execute({ id: 119 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/sections/119");
  assertEquals(out, { id: 119, name: "Intermediate" });
});
