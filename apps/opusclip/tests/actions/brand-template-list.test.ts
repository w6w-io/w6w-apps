import { assertEquals } from "@std/assert";
import brandTemplateList from "../../actions/brand-template-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("brand-template-list: GETs /api/brand-templates?q=mine", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: [{ templateId: "t1", name: "Karaoke", isDefault: true, preferences: {} }] },
  ]);
  const out = await brandTemplateList.execute({}, ctx) as { items: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/brand-templates");
  assertEquals(queryOf(calls[0].url), { q: "mine" });
  assertEquals(out.items.length, 1);
});

Deno.test("brand-template-list: an empty list is returned as an empty array, not undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [] }]);
  const out = await brandTemplateList.execute({}, ctx) as { items: unknown[] };
  assertEquals(out.items, []);
});
