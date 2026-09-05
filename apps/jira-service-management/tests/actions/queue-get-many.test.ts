import { assertEquals } from "@std/assert";
import { mockJsmCtx } from "../_helpers.ts";
import action from "../../actions/queue-get-many.ts";

Deno.test("queue-get-many: GETs queues under the service desk", async () => {
  const { ctx, calls } = mockJsmCtx([{ body: { values: [] } }]);
  await action.execute({ serviceDeskId: "10" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.atlassian.net/rest/servicedeskapi/servicedesk/10/queue?start=0&limit=50",
  );
});

Deno.test("queue-get-many: forwards includeCount", async () => {
  const { ctx, calls } = mockJsmCtx([{ body: {} }]);
  await action.execute({ serviceDeskId: "10", includeCount: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("includeCount"), "true");
});
