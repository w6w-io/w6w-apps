import { assertEquals, assertRejects } from "@std/assert";
import customFieldValueSetTask from "../../actions/custom-field-value-set-task.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

/**
 * The body is a TAGGED pair — `{customFieldInstanceId, value: {type, value}}` —
 * not a bare scalar. The inner `type` is the documented discriminator, and it is
 * assembled here so it cannot be mistyped.
 */
Deno.test("custom-field-value-set-task: POSTs the tagged value pair to /beta", async () => {
  const { ctx, calls } = mockCtx([{ body: { type: "text", value: "in progress" } }]);
  await customFieldValueSetTask.execute({
    taskId: "t1",
    customFieldInstanceId: "cf1",
    type: "text",
    value: '"in progress"',
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/beta/custom-field-values/task/t1");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), {
    customFieldInstanceId: "cf1",
    value: { type: "text", value: "in progress" },
  });
});

Deno.test("custom-field-value-set-task: non-string values survive their JSON type", async () => {
  const number = mockCtx([{ body: {} }]);
  await customFieldValueSetTask.execute(
    { taskId: "t1", customFieldInstanceId: "cf1", type: "number", value: "42" },
    number.ctx,
  );
  assertEquals(
    (bodyOf(number.calls[0]) as { value: { value: unknown } }).value.value,
    42,
  );

  const multi = mockCtx([{ body: {} }]);
  await customFieldValueSetTask.execute(
    { taskId: "t1", customFieldInstanceId: "cf1", type: "multiSelect", value: '["a","b"]' },
    multi.ctx,
  );
  assertEquals(
    (bodyOf(multi.calls[0]) as { value: { value: unknown } }).value.value,
    ["a", "b"],
  );

  const checkbox = mockCtx([{ body: {} }]);
  await customFieldValueSetTask.execute(
    { taskId: "t1", customFieldInstanceId: "cf1", type: "checkbox", value: false },
    checkbox.ctx,
  );
  assertEquals(
    (bodyOf(checkbox.calls[0]) as { value: { value: unknown } }).value.value,
    false,
  );
});

Deno.test("custom-field-value-set-task: a missing value fails before a request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await customFieldValueSetTask.execute(
        { taskId: "t1", customFieldInstanceId: "cf1", type: "text", value: undefined },
        ctx,
      );
    },
    Error,
    "Value is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("custom-field-value-set-task: setting a value twice is safe", () => {
  assertEquals(customFieldValueSetTask.idempotent, true);
});
