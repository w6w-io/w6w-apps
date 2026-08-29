import { assertEquals, assertRejects } from "@std/assert";
import queueScheduleReplace from "../../actions/queue-schedule-replace.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("queue-schedule-replace: PUTs the rules array verbatim", async () => {
  const rules = [{ h: 9, m: 0, days: ["mon", "wed", "fri"] }];
  const { ctx, calls } = mockCtx([{
    body: { social_set_id: 4, timezone: "UTC", rules },
  }]);
  await queueScheduleReplace.execute({ socialSetId: 4, rules }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/social-sets/4/queue/schedule");
  assertEquals(JSON.parse(calls[0].body!), { rules });
});

Deno.test("queue-schedule-replace: an empty array is a valid, explicit empty schedule", async () => {
  const { ctx, calls } = mockCtx([{ body: { social_set_id: 4, timezone: "UTC", rules: [] } }]);
  await queueScheduleReplace.execute({ socialSetId: 4, rules: [] }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { rules: [] });
});

Deno.test("queue-schedule-replace: rejects invalid JSON before making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await queueScheduleReplace.execute({ socialSetId: 4, rules: "{bad" }, ctx),
  );
  assertEquals(calls.length, 0);
});

Deno.test("queue-schedule-replace: idempotent, because PUT is a full replacement", () => {
  assertEquals(queueScheduleReplace.idempotent, true);
});
