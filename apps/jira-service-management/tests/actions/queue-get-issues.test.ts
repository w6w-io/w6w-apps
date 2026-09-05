import { assertEquals } from "@std/assert";
import { mockJsmCtx } from "../_helpers.ts";
import action from "../../actions/queue-get-issues.ts";

Deno.test("queue-get-issues: GETs the issues in a specific queue", async () => {
  const { ctx, calls } = mockJsmCtx([{ body: { values: [] } }]);
  await action.execute({ serviceDeskId: "10", queueId: "5" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.atlassian.net/rest/servicedeskapi/servicedesk/10/queue/5/issue?start=0&limit=50",
  );
});
