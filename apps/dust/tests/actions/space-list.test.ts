import { assertEquals } from "@std/assert";
import spaceList from "../../actions/space-list.ts";
import { mockCtxWithConnection, pathOf, queryOf } from "../_helpers.ts";

Deno.test("space-list: hits /spaces with no query when kinds is unset", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ body: { spaces: [{ sId: "sp_1" }] } }]);
  const result = await spaceList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), `/api/v1/w/${ctx.connection?.display?.workspaceId}/spaces`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(result, { spaces: [{ sId: "sp_1" }] });
});

Deno.test("space-list: joins a multiselect array into a comma-separated kinds param", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ body: { spaces: [] } }]);
  await spaceList.execute({ kinds: ["system", "project"] }, ctx);
  assertEquals(queryOf(calls[0].url), { kinds: "system,project" });
});
