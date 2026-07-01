import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-ticket.ts";

Deno.test("create-ticket: POSTs /crm/v3/objects/tickets with pipeline/stage/subject", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1" } }]);
  await action.execute!(
    { subject: "Server down", hs_pipeline: "0", hs_pipeline_stage: "1" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/tickets");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.properties.subject, "Server down");
  assertEquals(body.properties.hs_pipeline, "0");
  assertEquals(body.properties.hs_pipeline_stage, "1");
});
