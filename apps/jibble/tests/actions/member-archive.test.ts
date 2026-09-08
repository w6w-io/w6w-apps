import { assertEquals } from "@std/assert";
import memberArchive from "../../actions/member-archive.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("member-archive: PATCHes status Removed", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await memberArchive.execute({ personId: "p1" }, ctx) as { ok: boolean };
  assertEquals(pathOf(calls[0].url), "/v1/People(p1)");
  assertEquals(JSON.parse(calls[0].body!), { status: "Removed" });
  assertEquals(out.ok, true);
});
