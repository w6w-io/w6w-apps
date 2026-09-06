import { assertEquals, assertRejects } from "@std/assert";
import timeOffUpdateStatus from "../../actions/time-off-update-status.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("time-off-update-status: PATCHes TimeOffIntervals(id) with the vendor's status field", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await timeOffUpdateStatus.execute({ timeOffId: "to1", status: "Approved" }, ctx) as {
    ok: boolean;
  };
  assertEquals(pathOf(calls[0].url), "/v1/TimeOffIntervals(to1)");
  assertEquals(JSON.parse(calls[0].body!), { status: "Approved" });
  assertEquals(out.ok, true);
});

Deno.test("time-off-update-status: requires status", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        timeOffUpdateStatus.execute({ timeOffId: "to1", status: "" as "Approved" }, ctx),
      ),
    Error,
    "status",
  );
});
