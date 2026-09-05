import { assertEquals } from "@std/assert";
import dataSourceList from "../../actions/data-source-list.ts";
import { mockCtxWithConnection, pathOf } from "../_helpers.ts";

Deno.test("data-source-list: hits /spaces/{spaceId}/data_sources", async () => {
  const { ctx, calls } = mockCtxWithConnection([
    { body: { data_sources: [{ name: "KB" }] } },
  ]);
  const result = await dataSourceList.execute({ spaceId: "sp_1" }, ctx);

  assertEquals(
    pathOf(calls[0].url),
    `/api/v1/w/${ctx.connection?.display?.workspaceId}/spaces/sp_1/data_sources`,
  );
  assertEquals(result, { data_sources: [{ name: "KB" }] });
});
