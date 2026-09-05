import { assertEquals, assertRejects } from "@std/assert";
import { mockBookingsCtx } from "../_helpers.ts";
import action from "../../actions/staff-add.ts";

Deno.test("staff-add: wraps the input into staffMap's data array, dropping unset fields", async () => {
  const { ctx, calls } = mockBookingsCtx([
    {
      body: { response: [{ id: "1", name: "Test1", email: "test1@test.com", status: "success" }] },
    },
  ]);
  const out = await action.execute(
    {
      name: "Test1",
      email: "test1@test.com",
      assignedServices: "82045000000112024, 82045000000098220",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/bookings/v1/json/addstaff");
  assertEquals(calls[0].method, "POST");
  const staffMap = JSON.parse(calls[0].form!.staffMap);
  assertEquals(staffMap, {
    data: [{
      name: "Test1",
      email: "test1@test.com",
      assigned_services: ["82045000000112024", "82045000000098220"],
    }],
  });
  assertEquals(out, { id: "1", name: "Test1", email: "test1@test.com", status: "success" });
});

Deno.test("staff-add: a 2xx per-item non-success status is thrown as an error", async () => {
  const { ctx } = mockBookingsCtx([
    { body: { response: [{ status: "Staff already exists" }] } },
  ]);
  await assertRejects(
    () => Promise.resolve(action.execute({ name: "Test1", email: "test1@test.com" }, ctx)),
    Error,
    "Staff already exists",
  );
});

Deno.test("staff-add: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
