import { assertEquals } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("user-get fetches by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { user_id: 5411295 } }]);
  const out = await userGet.execute({ userId: 5411295 }, ctx);
  assertEquals(out, { user_id: 5411295 });
  assertEquals(calls[0].url, `${API_ROOT}/users/5411295`);
});
