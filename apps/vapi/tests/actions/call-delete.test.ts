import { assertEquals } from "@std/assert";
import callDelete from "../../actions/call-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-delete: calls DELETE /call/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  const out = await callDelete.execute({ id: "c1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/call/c1");
  assertEquals(out, { id: "c1" });
});

Deno.test("call-delete: description makes clear this erases data, not a live call", () => {
  assertEquals(/does not end a live call/i.test(callDelete.description ?? ""), true);
});
