import { assertEquals } from "@std/assert";
import attachmentList from "../../actions/attachment-list.ts";
import { envelope, mockWrikeCtx, pathOf } from "../_helpers.ts";

Deno.test("attachment-list: GETs /tasks/{taskId}/attachments", async () => {
  const { ctx, calls } = mockWrikeCtx([
    { status: 200, body: envelope([{ id: "A1", name: "spec.pdf" }]) },
  ]);
  const out = await attachmentList.execute({ taskId: "T1" }, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/v4/tasks/T1/attachments");
  assertEquals(out.items, [{ id: "A1", name: "spec.pdf" }]);
});
