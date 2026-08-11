import { assertEquals, assertRejects } from "@std/assert";
import automationGoalAchieve from "../../actions/automation-goal-achieve.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const OK = { results: [{ success: true, message: "Goal achieved", automation_id: 1, goal_id: 2 }] };

/**
 * "You must provide EITHER (`integration` + `call_name`) OR (`automation_id` +
 * `goal_id`), along with `contact_id`." Only `contact_id` is in the schema's
 * `required` list, so a request naming neither pair passes schema validation
 * and fails at runtime.
 */
Deno.test("automation-goal-achieve: the integration/call-name pair is sent alone", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await automationGoalAchieve.execute(
    { contactId: "789", integration: "my_integration", callName: "goal_achieved" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/automations/goals/achieve");
  assertEquals(JSON.parse(calls[0].body!), {
    contact_id: 789,
    integration: "my_integration",
    call_name: "goal_achieved",
  });
});

Deno.test("automation-goal-achieve: the automation/goal id pair is sent alone", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await automationGoalAchieve.execute({ contactId: "789", automationId: "1", goalId: "2" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { contact_id: 789, automation_id: 1, goal_id: 2 });
});

/**
 * These three ids are declared `type: integer` on this endpoint and
 * `type: string` on every other v2 endpoint in this app.
 */
Deno.test("automation-goal-achieve: the ids go on the wire as numbers, uniquely on this endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await automationGoalAchieve.execute({ contactId: "789", automationId: "1", goalId: "2" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(typeof body.contact_id, "number");
  assertEquals(typeof body.automation_id, "number");
  assertEquals(typeof body.goal_id, "number");
});

Deno.test("automation-goal-achieve: neither pair is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await automationGoalAchieve.execute({ contactId: "789" }, ctx),
    Error,
    "Supply either the integration and call name",
  );
  assertEquals(calls.length, 0);
});

Deno.test("automation-goal-achieve: both pairs together is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await automationGoalAchieve.execute(
        { contactId: "789", integration: "i", callName: "c", automationId: "1", goalId: "2" },
        ctx,
      ),
    Error,
    "rejects both together",
  );
  assertEquals(calls.length, 0);
});

Deno.test("automation-goal-achieve: half a pair is not a pair", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await automationGoalAchieve.execute({ contactId: "789", integration: "i" }, ctx),
    Error,
    "both",
  );
  assertEquals(calls.length, 0);
});

/**
 * The response is a LIST — one entry per goal matched, because an
 * integration/call-name pair can appear in several campaigns. A 200 with every
 * entry unsuccessful is an ordinary response.
 */
Deno.test("automation-goal-achieve: a 200 whose results all failed is counted, not treated as success", async () => {
  const { ctx } = mockCtx([{
    body: {
      results: [
        { success: true, goal_id: 1 },
        { success: false, goal_id: 2, message: "Contact not in campaign" },
      ],
    },
  }]);
  const out = await automationGoalAchieve.execute(
    { contactId: "789", integration: "i", callName: "c" },
    ctx,
  ) as { achieved: number; failed: number };
  assertEquals(out.achieved, 1);
  assertEquals(out.failed, 1);
});

Deno.test("automation-goal-achieve: is declared non-idempotent — firing twice re-enters the contact", () => {
  assertEquals(automationGoalAchieve.idempotent, false);
});
