import { assertEquals } from "@std/assert";
import pushList from "../../actions/push-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("push-list: GETs /v2/pushes with mapped query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { pushes: [{ iden: "p1" }] } }]);
  const out = await pushList.execute(
    { modifiedAfter: 1400000000, active: true, cursor: "c1", limit: 10 },
    ctx,
  ) as { pushes: unknown[]; cursor?: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/pushes");
  assertEquals(
    queryOf(calls[0].url),
    { modified_after: "1400000000", active: "true", cursor: "c1", limit: "10" },
  );
  assertEquals(out.pushes.length, 1);
});

Deno.test("push-list: omits unset params entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: { pushes: [] } }]);
  await pushList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("push-list: passes through a pagination cursor", async () => {
  const { ctx } = mockCtx([{ body: { pushes: [], cursor: "next-page" } }]);
  const out = await pushList.execute({}, ctx) as { cursor?: string };
  assertEquals(out.cursor, "next-page");
});
