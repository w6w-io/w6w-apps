import { assertEquals, assertRejects } from "@std/assert";
import taskCreate from "../../actions/task-create.ts";
import { bodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const CREATED = { task_id: 5, text: "Call Acme" };

Deno.test("task-create: without a reference it POSTs to /task/", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  assertEquals(await taskCreate.execute({ text: "Call Acme" }, ctx), { task: CREATED });
  assertEquals(pathOf(calls[0].url), "/task/");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { text: "Call Acme" });
});

Deno.test("task-create: with a reference it POSTs to the referenced form", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  await taskCreate.execute({ text: "Call Acme", refType: "item", refId: "9" }, ctx);
  assertEquals(pathOf(calls[0].url), "/task/item/9/");
  // The reference lives in the path, not the body, for this form.
  assertEquals(bodyOf(calls[0]), { text: "Call Acme" });
});

/** Half a reference would silently create an unattached task. */
Deno.test("task-create: half a reference is refused before any request", async () => {
  for (const half of [{ refType: "item" }, { refId: "9" }]) {
    const { ctx, calls } = mockCtx([]);
    await assertRejects(
      () => Promise.resolve(taskCreate.execute({ text: "x", ...half }, ctx)),
      Error,
      "must be given together",
    );
    assertEquals(calls.length, 0);
  }
});

/**
 * Podio accepts five shapes for `responsible`, over five identifier types. The
 * `mail` type assigns by email address without a user-id lookup — the useful
 * one, and the one nobody finds.
 */
Deno.test("task-create: responsible passes through in whichever documented shape it arrives", async () => {
  for (
    const responsible of [
      2050398,
      { type: "mail", id: "someone@example.com" },
      [2050398, { type: "mail", id: "someone@example.com" }],
    ]
  ) {
    const { ctx, calls } = mockCtx([{ body: CREATED }]);
    await taskCreate.execute({ text: "x", responsible }, ctx);
    assertEquals(bodyOf(calls[0]).responsible, responsible);
  }
});

Deno.test("task-create: responsible may arrive as a typed JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  await taskCreate.execute({ text: "x", responsible: '[{"type":"mail","id":"a@b.com"}]' }, ctx);
  assertEquals(bodyOf(calls[0]).responsible, [{ type: "mail", id: "a@b.com" }]);
});

Deno.test("task-create: every optional field maps to its documented snake_case name", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  await taskCreate.execute({
    text: "x",
    description: "d",
    dueDate: "2026-01-01",
    dueOn: "2026-01-01T09:00:00Z",
    private: true,
    labels: "a, b",
    externalId: "t-1",
    hook: false,
    silent: true,
  }, ctx);
  assertEquals(bodyOf(calls[0]), {
    text: "x",
    description: "d",
    due_date: "2026-01-01",
    due_on: "2026-01-01T09:00:00Z",
    private: true,
    labels: ["a", "b"],
    external_id: "t-1",
  });
  assertEquals(queryOf(calls[0].url), { hook: "false", silent: "true" });
});

Deno.test("task-create: private=false is sent, not dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: CREATED }]);
  await taskCreate.execute({ text: "x", private: false }, ctx);
  assertEquals(bodyOf(calls[0]).private, false);
});

Deno.test("task-create: is declared non-idempotent — a retry makes a second task", () => {
  assertEquals(taskCreate.idempotent, false);
  assertEquals(taskCreate.type, "perform");
});

Deno.test("task-create: offers exactly the five reference types Podio documents", () => {
  const refType = taskCreate.params!.find((p) => p.key === "refType")!;
  assertEquals(refType.validation?.enum, ["item", "status", "app", "space", "conversation"]);
});
