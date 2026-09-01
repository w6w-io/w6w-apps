import { assertEquals } from "@std/assert";
import leadGet from "../../actions/lead-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-get: metadata", () => {
  assertEquals(leadGet.type, "read");
});

Deno.test("lead-get: GET /leads/{leadId}, returns the object verbatim", async () => {
  const body = { id: "l1", name: "Gumersindo", events: [], tasks: [], files: [] };
  const { ctx, calls } = mockCtx([{ status: 200, body }]);
  const result = await leadGet.execute({ leadId: "l1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/crm/v1/leads/l1");
  assertEquals(result, body);
});
