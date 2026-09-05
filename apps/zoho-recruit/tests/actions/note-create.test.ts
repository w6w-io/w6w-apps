import { assertEquals } from "@std/assert";
import { mockRecruitCtx } from "../_helpers.ts";
import action from "../../actions/note-create.ts";

Deno.test("note-create: POSTs to /Notes with Parent_Id and se_module naming the parent record", async () => {
  const { ctx, calls } = mockRecruitCtx([
    { body: { data: [{ code: "SUCCESS", status: "success", details: { id: "n1" } }] } },
  ]);
  await action.execute(
    { parentId: "c1", module: "Candidates", title: "Contacted", content: "Need to follow up" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/recruit/v2/Notes");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    data: [{
      Note_Title: "Contacted",
      Note_Content: "Need to follow up",
      Parent_Id: "c1",
      se_module: "Candidates",
    }],
  });
});

Deno.test("note-create: not idempotent — every call creates a new note", () => {
  assertEquals(action.idempotent, false);
});
