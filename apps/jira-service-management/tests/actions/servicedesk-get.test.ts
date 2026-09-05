import { assertEquals } from "@std/assert";
import { mockJsmCtx } from "../_helpers.ts";
import action from "../../actions/servicedesk-get.ts";

Deno.test("servicedesk-get: GETs the service desk by id", async () => {
  const { ctx, calls } = mockJsmCtx([{ body: { id: "10", projectKey: "HELPDESK" } }]);
  const out = await action.execute({ serviceDeskId: "10" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://acme.atlassian.net/rest/servicedeskapi/servicedesk/10");
  assertEquals(out, { id: "10", projectKey: "HELPDESK" });
});
