import { assertEquals } from "@std/assert";
import spaceList from "../../actions/space-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("space-list: GETs the org's space collection", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ space_id: 7 }] }]);
  const out = await spaceList.execute({ orgId: "1" }, ctx);
  assertEquals(out, { spaces: [{ space_id: 7 }] });
  assertEquals(pathOf(calls[0].url), "/org/1/space/");
  assertEquals(calls[0].method, "GET");
});

Deno.test("space-list: an org id is path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await spaceList.execute({ orgId: "1/../2" }, ctx);
  assertEquals(pathOf(calls[0].url), "/org/1%2F..%2F2/space/");
});

Deno.test("space-list: an empty body yields an empty list", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await spaceList.execute({ orgId: "1" }, ctx), { spaces: [] });
});
