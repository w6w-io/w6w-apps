import { assertEquals, assertRejects } from "@std/assert";
import fieldValuesList from "../../actions/field-values-list.ts";
import { mockCtx, queryOf } from "../_helpers.ts";

Deno.test("field-values-list: calls GET /field-values?person_id=", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 250616, field_id: 337 }] }]);
  await fieldValuesList.execute({ personId: 38706 }, ctx);
  assertEquals(queryOf(calls[0].url).person_id, "38706");
});

Deno.test("field-values-list: rejects when no id is given", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => {
      await fieldValuesList.execute({}, ctx);
    },
    Error,
    "Exactly one of",
  );
});

Deno.test("field-values-list: rejects when more than one id is given", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => {
      await fieldValuesList.execute({ personId: 1, organizationId: 2 }, ctx);
    },
    Error,
    "Exactly one of",
  );
});
