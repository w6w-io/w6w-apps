import { assertEquals } from "@std/assert";
import { BASE_PATH, bodyOf, DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/entry-create.ts";

const fieldValues = { "25": "Jane", "26": "jane@example.com" };

Deno.test("entry-create: POSTs to the form-scoped /forms/{id}/entries route", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "160" } }], { display: DISPLAY });
  await action.execute({ formId: 30, fieldValues }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/forms/30/entries`);
});

Deno.test("entry-create: field values sit at the top level, keyed by field ID", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute({ formId: 30, fieldValues }, ctx);
  assertEquals(bodyOf(calls), fieldValues);
});

Deno.test("entry-create: is not idempotent and logs", async () => {
  assertEquals(action.idempotent, false);
  const { ctx, logs } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute({ formId: 30, fieldValues }, ctx);
  assertEquals(logs[0].level, "info");
});
