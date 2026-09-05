import { assert, assertEquals } from "@std/assert";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import pipeUpdate from "../../actions/pipe-update.ts";

Deno.test("pipe-update: sends only the fields given, with color as a bare enum", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { updatePipe: { pipe: { id: "1", name: "New name", color: "green" } } } },
  }]);
  const out = await pipeUpdate.execute(
    { id: "1", name: "New name", color: "green" },
    ctx,
  ) as { name: string };
  assertEquals(out.name, "New name");
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert(q.startsWith("mutation { updatePipe(input:"));
  assert(q.includes('name: "New name"'));
  assert(!q.includes('color: "green"'), "color must be a bare enum, not a quoted string");
  assert(q.includes("color: green"));
});

Deno.test("pipe-update: public and anyoneCanCreateCard map to snake_case booleans", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { updatePipe: { pipe: { id: "1" } } } } }]);
  await pipeUpdate.execute({ id: "1", public: true, anyoneCanCreateCard: false }, ctx);
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert(q.includes("public: true"));
  assert(q.includes("anyone_can_create_card: false"));
});

Deno.test("pipe-update: type/resource/idempotency metadata", () => {
  assertEquals(pipeUpdate.type, "perform");
  assertEquals(pipeUpdate.resource, "pipe");
  assertEquals(pipeUpdate.idempotent, true);
});
