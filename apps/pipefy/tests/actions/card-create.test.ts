import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import cardCreate from "../../actions/card-create.ts";

Deno.test("card-create: creates a card with field values", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { createCard: { card: { id: "1", title: "New card" } } } },
  }]);
  const out = await cardCreate.execute(
    {
      pipeId: "123",
      title: "New card",
      fields: [{ field_id: "field_1", field_value: "Value 1" }],
    },
    ctx,
  ) as { title: string };
  assertEquals(out.title, "New card");
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert(q.startsWith("mutation { createCard(input:"));
  assert(q.includes("pipe_id: 123"));
  assert(q.includes('title: "New card"'));
  assert(q.includes('fields_attributes: [{ field_id: "field_1", field_value: "Value 1" }]'));
});

Deno.test("card-create: works with no field values", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { createCard: { card: { id: "1", title: "Bare" } } } },
  }]);
  await cardCreate.execute({ pipeId: "123", title: "Bare" }, ctx);
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert(!q.includes("fields_attributes"));
});

Deno.test("card-create: an invalid fields JSON string names the field", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await cardCreate.execute({ pipeId: "123", title: "x", fields: "{not json" }, ctx),
    Error,
    "fields",
  );
});

Deno.test("card-create: type/resource/idempotency metadata", () => {
  assertEquals(cardCreate.type, "perform");
  assertEquals(cardCreate.resource, "card");
  assertEquals(cardCreate.idempotent, false);
});
