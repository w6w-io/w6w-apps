import { assertEquals } from "@std/assert";
import transcriptDelete from "../../actions/transcript-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("transcript-delete: DELETEs /v2/transcript/{id} and returns the marked-deleted transcript", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "t1", status: "completed", audio_url: "http://deleted_by_user" },
  }]);
  const out = await transcriptDelete.execute({ transcriptId: "t1" }, ctx) as {
    audio_url: string;
  };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/transcript/t1");
  assertEquals(out.audio_url, "http://deleted_by_user");
});

Deno.test("transcript-delete: is declared idempotent", () => {
  assertEquals(transcriptDelete.idempotent, true);
});
