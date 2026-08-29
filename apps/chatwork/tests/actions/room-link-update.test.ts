import { assertEquals } from "@std/assert";
import roomLinkUpdate from "../../actions/room-link-update.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("room-link-update: PUTs only the fields given, including an explicit false", async () => {
  const { ctx, calls } = mockCtx([{ body: { public: true } }]);
  await roomLinkUpdate.execute({ roomId: "5", needAcceptance: false }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/rooms/5/link");
  assertEquals(calls[0].method, "PUT");
  assertEquals(formOf(calls[0]), { need_acceptance: "0" });
});

Deno.test("room-link-update: an unset needAcceptance leaves it unchanged (omitted)", async () => {
  const { ctx, calls } = mockCtx([{ body: { public: true } }]);
  await roomLinkUpdate.execute({ roomId: "5", description: "New description" }, ctx);
  assertEquals(formOf(calls[0]), { description: "New description" });
});
