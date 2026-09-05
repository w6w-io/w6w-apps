import { assertEquals } from "@std/assert";
import schemaUpdate from "../../actions/schema-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const fields = [
  { type: "scalar", data: { name: "total_amount", type: "decimal" } },
];

Deno.test("schema-update: posts fields and wraps the bare boolean response", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: true }]);
  const result = await schemaUpdate.execute({ inboxId: "in_1", fields }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/inboxes/in_1/schema");
  assertEquals(calls[0].body, JSON.stringify({ fields }));
  assertEquals(result, { updated: true });
});

Deno.test("schema-update: a bare `false` response is not coerced to true", async () => {
  const { ctx } = mockCtx([{ status: 200, body: false }]);
  const result = await schemaUpdate.execute({ inboxId: "in_1", fields }, ctx);
  assertEquals(result, { updated: false });
});

Deno.test("schema-update: marked idempotent — reposting the same schema is a no-op state change", () => {
  assertEquals(schemaUpdate.idempotent, true);
});
