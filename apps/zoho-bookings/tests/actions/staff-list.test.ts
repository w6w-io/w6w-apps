import { assertEquals } from "@std/assert";
import { mockBookingsCtx } from "../_helpers.ts";
import action from "../../actions/staff-list.ts";

Deno.test("staff-list: GETs /staffs with only the provided filters", async () => {
  const { ctx, calls } = mockBookingsCtx([
    { body: { response: { status: "success", returnvalue: { data: [] } } } },
  ]);
  await action.execute({ staffEmail: "maria" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/bookings/v1/json/staffs");
  assertEquals(url.searchParams.get("staff_email"), "maria");
  assertEquals(url.searchParams.has("staff_id"), false);
  assertEquals(url.searchParams.has("service_id"), false);
  assertEquals(url.searchParams.has("workspace_id"), false);
});

Deno.test("staff-list: does not fall back to the connection's workspace id — every param is optional here", async () => {
  const { ctx, calls } = mockBookingsCtx(
    [{ body: { response: { status: "success", returnvalue: { data: [] } } } }],
    "www.zohoapis.com",
    "3848021000000027004",
  );
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("workspace_id"), false);
});
