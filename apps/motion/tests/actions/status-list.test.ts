import { assertEquals } from "@std/assert";
import statusList from "../../actions/status-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

/**
 * This endpoint answers a BARE array — no `meta`, no cursor — unlike the eight
 * paginated collections. Running it through the envelope reader would return an
 * empty list forever.
 */
Deno.test("status-list: reads a bare array and wraps it as items", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: [
        { name: "Todo", isDefaultStatus: true, isResolvedStatus: false },
        { name: "Done", isDefaultStatus: false, isResolvedStatus: true },
      ],
    },
  ]);
  const out = await statusList.execute({ workspaceId: "ws1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/statuses");
  assertEquals(queryOf(calls[0].url), { workspaceId: "ws1" });
  assertEquals(out, {
    items: [
      { name: "Todo", isDefaultStatus: true, isResolvedStatus: false },
      { name: "Done", isDefaultStatus: false, isResolvedStatus: true },
    ],
  });
});

Deno.test("status-list: an empty body reads as an empty list", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await statusList.execute({}, ctx), { items: [] });
});
