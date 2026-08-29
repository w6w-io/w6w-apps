import { assertEquals } from "@std/assert";
import voteGet from "../../actions/vote-get.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("vote-get: retrieves by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "v1" } }]);
  await voteGet.execute({ id: "v1" }, ctx);

  assertEquals(calls[0].url, "https://canny.io/api/v1/votes/retrieve");
  assertEquals(bodyOf(calls[0]), { id: "v1" });
});
