import { assertEquals } from "@std/assert";
import attachmentGet from "../../actions/attachment-get.ts";
import { envelope, mockWrikeCtx, pathOf } from "../_helpers.ts";

Deno.test("attachment-get: joins ids into the path", async () => {
  const { ctx, calls } = mockWrikeCtx([{ status: 200, body: envelope([{ id: "A1" }]) }]);
  await attachmentGet.execute({ attachmentIds: "A1,A2" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v4/attachments/A1,A2");
});
