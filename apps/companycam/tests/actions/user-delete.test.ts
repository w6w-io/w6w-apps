import { assertEquals } from "@std/assert";
import userDelete from "../../actions/user-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-delete: DELETEs and reports the 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  const result = await userDelete.execute({ userId: "9", actAs: "boss@x.com" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/users/9");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].headers["x-companycam-user"], "boss@x.com");
  assertEquals(result, { status: 204 });
});
