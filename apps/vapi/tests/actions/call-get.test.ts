import { assertEquals } from "@std/assert";
import callGet from "../../actions/call-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-get: calls GET /call/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1", status: "ended" } }]);
  const out = await callGet.execute({ id: "c1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/call/c1");
  assertEquals(out, { id: "c1", status: "ended" });
});
