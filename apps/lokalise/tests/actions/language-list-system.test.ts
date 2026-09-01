import { assertEquals } from "@std/assert";
import languageListSystem from "../../actions/language-list-system.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("language-list-system: lists the global language catalog, no project scoping", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: { languages: [{ lang_iso: "en" }] },
      headers: { "content-type": "application/json", "x-total-count": "180" },
    },
  ]);
  const out = await languageListSystem.execute({ limit: 200 }, ctx) as {
    items: unknown[];
    totalCount?: number;
  };
  assertEquals(pathOf(calls[0].url), "/api2/system/languages");
  assertEquals(out.items, [{ lang_iso: "en" }]);
  assertEquals(out.totalCount, 180);
});

Deno.test("language-list-system: has no cursor param — this endpoint only supports limit/page", () => {
  assertEquals(languageListSystem.params?.some((p) => p.key === "cursor"), false);
});
