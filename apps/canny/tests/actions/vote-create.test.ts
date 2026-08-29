import { assertEquals } from "@std/assert";
import voteCreate from "../../actions/vote-create.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("vote-create: posts postID and voterID, unwraps the confirmation", async () => {
  const { ctx, calls } = mockCtx([{ body: '"success"' }]);
  const out = await voteCreate.execute({ postID: "p1", voterID: "u1" }, ctx) as {
    message: string;
  };

  assertEquals(calls[0].url, "https://canny.io/api/v1/votes/create");
  assertEquals(bodyOf(calls[0]), { postID: "p1", voterID: "u1" });
  assertEquals(out.message, "success");
});

Deno.test("vote-create: is idempotent — Canny's own docs say 'created or already exists'", () => {
  assertEquals(voteCreate.idempotent, true);
});
