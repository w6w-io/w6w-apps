import { assertEquals } from "@std/assert";
import { mockJsmCtx } from "../_helpers.ts";
import action from "../../actions/sla-get-many.ts";

Deno.test("sla-get-many: GETs the request's SLA information", async () => {
  const { ctx, calls } = mockJsmCtx([{ body: { values: [] } }]);
  await action.execute({ issueIdOrKey: "HD-1" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.atlassian.net/rest/servicedeskapi/request/HD-1/sla?start=0&limit=50",
  );
});
