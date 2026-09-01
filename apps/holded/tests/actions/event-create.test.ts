import { assertEquals } from "@std/assert";
import eventCreate from "../../actions/event-create.ts";
import { asMutation, mockCtx, writeResult } from "../_helpers.ts";

Deno.test("event-create: metadata — not idempotent", () => {
  assertEquals(eventCreate.type, "perform");
  assertEquals(eventCreate.idempotent, false);
});

Deno.test("event-create: POST /events with the fields set, tags normalised to an array", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: writeResult("Created", "new-id") }]);
  const result = asMutation(
    await eventCreate.execute({
      name: "Coffee with P",
      kind: "coffee",
      startDate: 1522228026,
      duration: 3600,
      tags: "tig, tag",
      leadId: "lead-1",
    }, ctx),
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Coffee with P",
    kind: "coffee",
    startDate: 1522228026,
    duration: 3600,
    tags: ["tig", "tag"],
    leadId: "lead-1",
  });
  assertEquals(result.id, "new-id");
});

Deno.test("event-create: array-form tags pass through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: writeResult("Created", "new-id") }]);
  await eventCreate.execute({ name: "x", tags: ["a", "b"] }, ctx);
  assertEquals(JSON.parse(calls[0].body!).tags, ["a", "b"]);
});

Deno.test("event-create: no fields set -> empty body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: writeResult("Created", "new-id") }]);
  await eventCreate.execute({}, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});
