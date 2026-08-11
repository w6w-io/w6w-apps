import { assertEquals } from "@std/assert";
import recurringTaskCreate from "../../actions/recurring-task-create.ts";
import taskCreate from "../../actions/task-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("recurring-task-create: POSTs /v1/recurring-tasks with content-type set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1" } }]);
  await recurringTaskCreate.execute({
    name: "Weekly review",
    workspaceId: "ws1",
    assigneeId: "u1",
    frequency: "weekly_specific_days_[MO, FR]",
    duration: "45",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/recurring-tasks");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), {
    name: "Weekly review",
    workspaceId: "ws1",
    assigneeId: "u1",
    // Motion's own grammar, sent verbatim — it is not cron.
    frequency: "weekly_specific_days_[MO, FR]",
    duration: 45,
  });
});

/** An assignee is optional on a one-off task and required on a recurring one. */
Deno.test("recurring-task-create: assigneeId is required, unlike on a one-off task", () => {
  assertEquals(
    recurringTaskCreate.params?.find((p) => p.key === "assigneeId")?.required,
    true,
  );
  assertEquals(taskCreate.params?.find((p) => p.key === "assigneeId")?.required, undefined);
});

/**
 * The two enums that differ from a one-off task's. Offering the task lists here
 * would put values in the dropdown that this endpoint rejects.
 */
Deno.test("recurring-task-create: priority and deadlineType take the narrower value sets", () => {
  const values = (key: string) =>
    ((recurringTaskCreate.params?.find((p) => p.key === key)?.options ?? []) as Array<
      { value: string }
    >).map((o) => o.value);

  assertEquals(values("priority"), ["HIGH", "MEDIUM"]);
  assertEquals(values("deadlineType"), ["HARD", "SOFT"]);

  const taskPriority = ((taskCreate.params?.find((p) => p.key === "priority")?.options ??
    []) as Array<{ value: string }>).map((o) => o.value);
  assertEquals(taskPriority, ["ASAP", "HIGH", "MEDIUM", "LOW"]);
});

Deno.test("recurring-task-create: is not idempotent", () => {
  assertEquals(recurringTaskCreate.idempotent, false);
});
