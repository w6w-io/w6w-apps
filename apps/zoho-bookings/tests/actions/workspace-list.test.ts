import { assertEquals } from "@std/assert";
import { mockBookingsCtx } from "../_helpers.ts";
import action from "../../actions/workspace-list.ts";

Deno.test("workspace-list: GETs /workspaces with no workspace_id when omitted", async () => {
  const { ctx, calls } = mockBookingsCtx([
    {
      body: {
        response: {
          status: "success",
          returnvalue: { data: [{ id: "1", name: "Chennai" }] },
        },
      },
    },
  ]);
  const out = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/bookings/v1/json/workspaces");
  assertEquals(url.searchParams.has("workspace_id"), false);
  assertEquals(out, { data: [{ id: "1", name: "Chennai" }] });
});

Deno.test("workspace-list: passes workspaceId through as workspace_id", async () => {
  const { ctx, calls } = mockBookingsCtx([
    { body: { response: { status: "success", returnvalue: { data: [] } } } },
  ]);
  await action.execute({ workspaceId: "42" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("workspace_id"), "42");
});
