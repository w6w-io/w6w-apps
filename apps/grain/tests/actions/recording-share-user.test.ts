import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/recording-share-user.ts";

Deno.test("recording-share-user: PUTs user_id in the body against /users (no id in path)", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const result = await action.execute({ recordingId: "r1", userId: "u1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/_/public-api/v2/recordings/r1/users");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { user_id: "u1" });
  assertEquals(result, { success: true });
});

Deno.test("recording-share-user: is an idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
