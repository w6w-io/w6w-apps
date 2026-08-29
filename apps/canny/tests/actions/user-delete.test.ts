import { assertEquals } from "@std/assert";
import userDelete from "../../actions/user-delete.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("user-delete: posts id, unwraps the confirmation", async () => {
  const { ctx, calls } = mockCtx([{ body: '"success"' }]);
  const out = await userDelete.execute({ id: "u1" }, ctx) as { message: string };

  assertEquals(calls[0].url, "https://canny.io/api/v1/users/delete");
  assertEquals(bodyOf(calls[0]), { id: "u1" });
  assertEquals(out.message, "success");
});
