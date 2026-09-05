import { assertEquals } from "@std/assert";
import deleteUser from "../../actions/delete-user.ts";
import { APP_ID, mockCtxWithConnection, pathOf } from "../_helpers.ts";

Deno.test("delete-user: DELETEs and returns the vendor's identity body, not a bare boolean", async () => {
  const { ctx, calls } = mockCtxWithConnection([
    { status: 202, body: { identity: { onesignal_id: "os-1" } } },
  ]);
  const out = await deleteUser.execute({ aliasId: "user_123" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), `/apps/${APP_ID}/users/by/external_id/user_123`);
  assertEquals(out, { identity: { onesignal_id: "os-1" } });
});
