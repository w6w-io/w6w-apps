import { assertEquals, assertRejects } from "@std/assert";
import richMenuUnlinkFromUser from "../../actions/rich-menu-unlink-from-user.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("rich-menu-unlink-from-user: DELETEs /v2/bot/user/{userId}/richmenu", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await richMenuUnlinkFromUser.execute({ userId: "U1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/bot/user/U1/richmenu");
});

Deno.test("rich-menu-unlink-from-user: requires userId", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await richMenuUnlinkFromUser.execute({ userId: "" }, ctx),
    Error,
    "userId",
  );
  assertEquals(calls.length, 0);
});

Deno.test("rich-menu-unlink-from-user: is declared idempotent", () => {
  assertEquals(richMenuUnlinkFromUser.idempotent, true);
});
