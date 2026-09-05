import { assertEquals, assertRejects } from "@std/assert";
import { mockBookingsCtx } from "../_helpers.ts";
import action from "../../actions/service-list.ts";

Deno.test("service-list: falls back to the connection's recorded workspace id", async () => {
  const { ctx, calls } = mockBookingsCtx(
    [{ body: { response: { status: "success", returnvalue: { data: [] } } } }],
    "www.zohoapis.com",
    "3848021000000027004",
  );
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/bookings/v1/json/services");
  assertEquals(url.searchParams.get("workspace_id"), "3848021000000027004");
});

Deno.test("service-list: an explicit workspaceId overrides the connection default", async () => {
  const { ctx, calls } = mockBookingsCtx([
    { body: { response: { status: "success", returnvalue: { data: [] } } } },
  ]);
  await action.execute({ workspaceId: "999", serviceId: "5", staffId: "6" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("workspace_id"), "999");
  assertEquals(url.searchParams.get("service_id"), "5");
  assertEquals(url.searchParams.get("staff_id"), "6");
});

Deno.test("service-list: throws an actionable error when no workspace id is known anywhere", async () => {
  const { ctx } = mockBookingsCtx([], "www.zohoapis.com", "");
  await assertRejects(() => Promise.resolve(action.execute({}, ctx)), Error, "List Workspaces");
});
