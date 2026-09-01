import { assertEquals } from "@std/assert";
import funnelCreate from "../../actions/funnel-create.ts";
import { mockCtx, writeResult } from "../_helpers.ts";

Deno.test("funnel-create: metadata — not idempotent", () => {
  assertEquals(funnelCreate.key, "funnel-create");
  assertEquals(funnelCreate.type, "perform");
  assertEquals(funnelCreate.idempotent, false);
});

Deno.test("funnel-create: POST /funnels with {name}", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: writeResult("Created", "new-id") }]);
  const result = await funnelCreate.execute({ name: "New funnel" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "New funnel" });
  assertEquals(result, { status: 1, info: "Created", id: "new-id" });
});
