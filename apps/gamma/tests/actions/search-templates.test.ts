import { assertEquals } from "@std/assert";
import searchTemplates from "../../actions/search-templates.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("search-templates: calls GET /templates/search and returns both lists", async () => {
  const { ctx, calls } = mockCtx([
    { body: { workspaceTemplates: [{ id: "t1" }], exploreTemplates: [{ id: "e1" }] } },
  ]);
  const out = await searchTemplates.execute({ q: "pitch", limit: 5 }, ctx) as {
    workspaceTemplates: Array<{ id: string }>;
    exploreTemplates: Array<{ id: string }>;
  };

  assertEquals(pathOf(calls[0].url), "/v1.0/templates/search");
  assertEquals(queryOf(calls[0].url), { q: "pitch", limit: "5" });
  assertEquals(out.workspaceTemplates[0].id, "t1");
  assertEquals(out.exploreTemplates[0].id, "e1");
});
