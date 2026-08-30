import { assertEquals } from "@std/assert";
import apiMetaGet from "../../actions/api-meta-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("api-meta-get: does not require auth", () => {
  assertEquals(apiMetaGet.requiresAuth, false);
});

Deno.test("api-meta-get: calls GET /", async () => {
  const { ctx, calls } = mockCtx([{ body: { documentation: "https://api.unbounce.com/doc" } }]);
  const out = await apiMetaGet.execute({}, ctx) as { documentation: string };

  assertEquals(pathOf(calls[0].url), "/");
  assertEquals(out.documentation, "https://api.unbounce.com/doc");
});
