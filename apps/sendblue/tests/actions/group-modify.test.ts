import { assertEquals } from "@std/assert";
import groupModify from "../../actions/group-modify.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-modify: POSTs to /api/modify-group with the modify_type verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "SUCCESS" } }]);
  await groupModify.execute({
    groupId: "g1",
    modifyType: "remove_recipient",
    number: "+15551234567",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/modify-group");
  assertEquals(jsonBodyOf(calls[0]), {
    group_id: "g1",
    modify_type: "remove_recipient",
    number: "+15551234567",
  });
});
