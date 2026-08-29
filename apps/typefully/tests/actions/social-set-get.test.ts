import { assertEquals } from "@std/assert";
import socialSetGet from "../../actions/social-set-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("social-set-get: fetches /v2/social-sets/{id}/ with the trailing slash", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, username: "acme", platforms: {} } }]);
  const out = await socialSetGet.execute({ socialSetId: 1 }, ctx) as { id: number };
  assertEquals(pathOf(calls[0].url), "/v2/social-sets/1/");
  assertEquals(out.id, 1);
});
