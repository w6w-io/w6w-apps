import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-scheduling-availability-update.ts";

Deno.test("user-scheduling-availability-update: PATCHes /users/{id}/scheduling-availability with raw JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "schedule" } }]);
  const weekly = [{
    day: "Monday",
    working_hours: [{
      start_time: "09:00",
      end_time: "12:00",
      locations: [{ type: "online_dynamic_link", value: "zoom" }],
    }],
  }];
  const overrides = [{ date: "2026-12-25", working_hours: [] }];
  await action.execute({ id: "USR-1", weekly, overrides }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/users/USR-1/scheduling-availability");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { weekly, overrides });
});
