import { assertEquals } from "@std/assert";
import voteDelete from "../../actions/vote-delete.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("vote-delete: posts postID and voterID, unwraps the confirmation", async () => {
  const { ctx, calls } = mockCtx([{ body: '"success"' }]);
  const out = await voteDelete.execute({ postID: "p1", voterID: "u1" }, ctx) as {
    message: string;
  };

  assertEquals(calls[0].url, "https://canny.io/api/v1/votes/delete");
  assertEquals(bodyOf(calls[0]), { postID: "p1", voterID: "u1" });
  assertEquals(out.message, "success");
});

Deno.test("vote-delete: is idempotent — Canny's own docs say 'deleted, or already doesn't exist'", () => {
  assertEquals(voteDelete.idempotent, true);
});
