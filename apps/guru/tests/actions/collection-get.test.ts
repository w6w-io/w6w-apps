import { assertEquals } from "@std/assert";
import collectionGet from "../../actions/collection-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("collection-get: fetches by id and strips the token", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "co1", name: "Eng", token: "live" } }]);
  const result = await collectionGet.execute({ collectionId: "co1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v1/collections/co1");
  assertEquals(result, { id: "co1", name: "Eng" });
});
