import { assertEquals } from "@std/assert";
import schemaClone from "../../actions/schema-clone.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("schema-clone: posts destination_inbox_id and wraps the bare boolean response", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: true }]);
  const result = await schemaClone.execute({ inboxId: "in_1", destinationInboxId: "in_2" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/inboxes/in_1/schema-clone");
  assertEquals(calls[0].body, JSON.stringify({ destination_inbox_id: "in_2" }));
  assertEquals(result, { cloned: true });
});

Deno.test("schema-clone: a bare `false` response is not coerced to true", async () => {
  const { ctx } = mockCtx([{ status: 200, body: false }]);
  const result = await schemaClone.execute({ inboxId: "in_1", destinationInboxId: "in_2" }, ctx);
  assertEquals(result, { cloned: false });
});

Deno.test("schema-clone: marked idempotent", () => {
  assertEquals(schemaClone.idempotent, true);
});
