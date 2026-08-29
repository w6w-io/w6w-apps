import { assertEquals } from "@std/assert";
import roomCreate from "../../actions/room-create.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("room-create: posts form-encoded fields to POST /rooms", async () => {
  const { ctx, calls } = mockCtx([{ body: { room_id: 5 } }]);
  const out = await roomCreate.execute({
    name: "Website renewal",
    membersAdminIds: "123, 542",
    membersMemberIds: "21,344",
    createLink: true,
    linkNeedAcceptance: false,
    iconPreset: "meeting",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/rooms");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(formOf(calls[0]), {
    name: "Website renewal",
    link: "1",
    link_need_acceptance: "0",
    members_admin_ids: "123,542",
    members_member_ids: "21,344",
    icon_preset: "meeting",
  });
  assertEquals(out, { room_id: 5 });
});

Deno.test("room-create: is not idempotent — retrying creates a second room", () => {
  assertEquals(roomCreate.idempotent, false);
});
