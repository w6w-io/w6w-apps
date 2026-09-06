import { assertEquals } from "@std/assert";
import action from "../../actions/delete-time-off.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("delete-time-off: sends DELETE to the id path", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { success: true, data: { message: "The absence period was deleted." } } },
  ]);
  const out = await action.execute({ id: 12345 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/company/time-offs/12345");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { message: "The absence period was deleted." });
});
