import { assert, assertEquals } from "@std/assert";
import hookCreate from "../../actions/hook-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("hook-create: POSTs the url and type to the object's hook collection", async () => {
  const { ctx, calls } = mockCtx([{ body: { hook_id: 42 } }]);
  const out = await hookCreate.execute({
    refType: "app",
    refId: "123",
    url: "https://example.com/hook",
    type: "item.create",
  }, ctx);
  assertEquals(out, { hookId: 42 });
  assertEquals(pathOf(calls[0].url), "/hook/app/123/");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { url: "https://example.com/hook", type: "item.create" });
});

/**
 * The call succeeds and the hook still delivers nothing. Saying so at creation
 * time is the only place a workflow author will notice.
 */
Deno.test("hook-create: logs and describes that the new hook is inactive", async () => {
  const { ctx, logs } = mockCtx([{ body: { hook_id: 42 } }]);
  await hookCreate.execute({
    refType: "app",
    refId: "1",
    url: "https://e.com",
    type: "item.create",
  }, ctx);
  assertEquals(logs.length, 1);
  assert(logs[0].message.includes("inactive until verified"));
  assertEquals(logs[0].data, { hookId: 42 });
  assert((hookCreate.description ?? "").includes("INACTIVE"));
});

Deno.test("hook-create: is declared non-idempotent — Podio makes a second hook", () => {
  assertEquals(hookCreate.idempotent, false);
  assertEquals(hookCreate.type, "perform");
});

/**
 * The valid event vocabulary depends on whether the hook is on an app or a
 * workspace, so a fixed dropdown would offer values that 400 half the time.
 */
Deno.test("hook-create: the event type is free text, and the hint says why", () => {
  const type = hookCreate.params!.find((p) => p.key === "type")!;
  assertEquals(type.type, "string");
  assertEquals(type.options, undefined);
  assert(type.hint!.includes("depends"));
});

Deno.test("hook-create: a bodyless response still yields a shaped result", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(
    await hookCreate.execute({ refType: "app", refId: "1", url: "https://e.com", type: "x" }, ctx),
    { hookId: undefined },
  );
});
