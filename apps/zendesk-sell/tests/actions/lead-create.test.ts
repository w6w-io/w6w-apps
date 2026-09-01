import { assertEquals } from "@std/assert";
import leadCreate from "../../actions/lead-create.ts";
import { dataEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-create: posts to /v2/leads with meta.type", async () => {
  const { ctx, calls } = mockCtx([{ body: dataEnvelope({ id: 1, status: "New" }) }]);
  const out = await leadCreate.execute({
    lastName: "Johnson",
    organizationName: "Design Services Company",
    sourceId: 10,
  }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/leads");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.meta, { type: "lead" });
  assertEquals(body.data.last_name, "Johnson");
  assertEquals(body.data.organization_name, "Design Services Company");
  assertEquals(body.data.source_id, 10);
  assertEquals(out.status, "New");
});
