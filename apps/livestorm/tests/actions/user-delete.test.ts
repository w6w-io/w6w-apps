import { assertEquals } from "@std/assert";
import userDelete from "../../actions/user-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-delete: DELETEs /users/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const result = await userDelete.execute({ id: "u1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/users/u1");
  assertEquals(result, { status: 204 });
});
