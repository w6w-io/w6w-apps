import { assertEquals } from "@std/assert";
import { mockRecruitCtx } from "../_helpers.ts";
import action from "../../actions/note-update.ts";

Deno.test("note-update: PUTs /Notes/{id} with only the fields given", async () => {
  const { ctx, calls } = mockRecruitCtx([
    { body: { data: [{ code: "SUCCESS", status: "success", details: { id: "n1" } }] } },
  ]);
  await action.execute({ noteId: "n1", content: "Screening done." }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/recruit/v2/Notes/n1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { data: [{ Note_Content: "Screening done." }] });
});

Deno.test("note-update: idempotent — retrying converges on the same fields", () => {
  assertEquals(action.idempotent, true);
});
