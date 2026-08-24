import { assertEquals } from "@std/assert";
import activityCreate from "../../actions/activity-create.ts";
import { envelope, mockCtx } from "../_helpers.ts";

Deno.test("activity-create: POSTs a TimeEntry with quantity in the field named for seconds", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: 1 }) }]);
  await activityCreate.execute(
    { type: "TimeEntry", date: "2026-08-24", matterId: 3, quantitySeconds: 5400, note: "Drafting" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!).data;
  assertEquals(body.type, "TimeEntry");
  assertEquals(body.quantity, 5400);
  assertEquals(body.matter, { id: 3 });
  assertEquals(body.note, "Drafting");
});

Deno.test("activity-create: is declared non-idempotent", () => {
  assertEquals(activityCreate.idempotent, false);
});
