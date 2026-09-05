import { assertEquals } from "@std/assert";
import cardGet from "../../actions/card-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("card-get: fetches the extended card by id", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "c1", preferredPhrase: "Onboarding", collection: { id: "co1", token: "t" } } },
  ]);
  const result = await cardGet.execute({ cardId: "c1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v1/cards/c1/extended");
  assertEquals(result, { id: "c1", preferredPhrase: "Onboarding", collection: { id: "co1" } });
});

Deno.test("card-get: escapes a cardId containing path-unsafe characters", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "x" } }]);
  await cardGet.execute({ cardId: "a/b?c" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/cards/a%2Fb%3Fc/extended");
});
