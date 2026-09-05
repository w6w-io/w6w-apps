import { assertEquals } from "@std/assert";
import programGet from "../../actions/program-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("program-get: fetches by program id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "johns-affiliate-program", currency: "USD" } }]);
  const out = await programGet.execute({ programId: "johns-affiliate-program" }, ctx);

  assertEquals(pathOf(calls[0].url), "/1.6/programs/johns-affiliate-program/");
  assertEquals(out, { id: "johns-affiliate-program", currency: "USD" });
});
