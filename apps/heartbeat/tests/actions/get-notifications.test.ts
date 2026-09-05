import { assertEquals } from "@std/assert";
import getNotifications from "../../actions/get-notifications.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-notifications: GET /notifications?email=", async () => {
  const { ctx, calls } = mockCtx([{ body: { count: 3 } }]);
  const out = await getNotifications.execute({ email: "a@b.com" }, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/v0/notifications");
  assertEquals(queryOf(calls[0].url), { email: "a@b.com" });
  assertEquals(out.count, 3);
});
