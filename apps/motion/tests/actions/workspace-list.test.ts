import { assert, assertEquals } from "@std/assert";
import workspaceList from "../../actions/workspace-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("workspace-list: calls GET /v1/workspaces and unwraps the `workspaces` key", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: page("workspaces", [{ id: "ws1", name: "Acme", teamId: "tm1", type: "team" }], {
        nextCursor: "c2",
      }),
    },
  ]);
  const out = await workspaceList.execute({ cursor: "c1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/workspaces");
  assertEquals(queryOf(calls[0].url), { cursor: "c1" });
  assertEquals(out, {
    items: [{ id: "ws1", name: "Acme", teamId: "tm1", type: "team" }],
    meta: { nextCursor: "c2", pageSize: 1 },
  });
});

/**
 * `ids` is documented as `array<string>` and Motion publishes no example
 * request, so its encoding is unspecified — a wrong guess silently returns the
 * wrong workspaces. Cursor is the only parameter offered.
 */
Deno.test("workspace-list: the undocumented-encoding ids array is not exposed", () => {
  const keys = (workspaceList.params ?? []).map((p) => p.key);
  assertEquals(keys, ["cursor"]);
  assert(!keys.includes("ids"));
});
