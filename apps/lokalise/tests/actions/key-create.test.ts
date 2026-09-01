import { assert, assertEquals } from "@std/assert";
import keyCreate from "../../actions/key-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("key-create: wraps a single key in the required array shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { keys: [{ key_id: 1 }], errors: [] } }]);
  await keyCreate.execute(
    { projectId: "p1", keys: '[{"key_name":"index.welcome","translations":[]}]' },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/keys");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    keys: [{ key_name: "index.welcome", translations: [] }],
  });
});

Deno.test("key-create: surfaces per-item errors alongside successes rather than hiding them", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        keys: [{ key_id: 1 }],
        errors: [{ message: "This key name is already taken", code: 400, key_name: "x" }],
      },
    },
  ]);
  const out = await keyCreate.execute({ projectId: "p1", keys: "[]" }, ctx) as {
    keys: unknown[];
    errors: unknown[];
  };
  assertEquals(out.keys.length, 1);
  assertEquals(out.errors.length, 1);
});

Deno.test("key-create: rejects invalid JSON with a labelled error rather than sending garbage", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () => keyCreate.execute({ projectId: "p1", keys: "not json" }, ctx),
    "Keys is not valid JSON",
  );
});

Deno.test("key-create: is not idempotent", () => {
  assertEquals(keyCreate.idempotent, false);
});

async function assertRejects(fn: () => unknown, substring: string): Promise<void> {
  try {
    await fn();
    throw new Error("expected rejection");
  } catch (e) {
    assert(e instanceof Error);
    assert(e.message.includes(substring), e.message);
  }
}
