import { assert, assertEquals, assertRejects } from "@std/assert";
import campaignCreate from "../../actions/campaign-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const SCHEDULE = { schedules: [{ name: "S1", timing: { from: "09:00", to: "17:00" } }] };

Deno.test("campaign-create: POSTs name, schedule and overrides", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "c1", name: "My Campaign" } }]);
  const out = await campaignCreate.execute(
    { name: "My Campaign", campaign_schedule: SCHEDULE, daily_limit: 50 },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/campaigns");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "My Campaign");
  assertEquals(body.campaign_schedule, SCHEDULE);
  assertEquals(body.daily_limit, 50);
  assertEquals(out.id, "c1");
});

Deno.test("campaign-create: campaign_schedule accepts the JSON string form a user types", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  await campaignCreate.execute(
    { name: "X", campaign_schedule: JSON.stringify(SCHEDULE) },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).campaign_schedule, SCHEDULE);
});

Deno.test("campaign-create: malformed schedule JSON fails before any request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await campaignCreate.execute({ name: "X", campaign_schedule: "{not json" }, ctx),
    Error,
    "Campaign schedule is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("campaign-create: campaign_schedule is required on create (unlike patch)", () => {
  const p = campaignCreate.params?.find((p) => p.key === "campaign_schedule");
  assert(p?.required === true);
});

Deno.test("campaign-create: is declared non-idempotent — every call mints a new campaign", () => {
  assertEquals(campaignCreate.idempotent, false);
});
