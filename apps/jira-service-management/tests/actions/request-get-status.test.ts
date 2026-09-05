import { assertEquals } from "@std/assert";
import { mockJsmCtx } from "../_helpers.ts";
import action from "../../actions/request-get-status.ts";

Deno.test("request-get-status: GETs the status history", async () => {
  const { ctx, calls } = mockJsmCtx([{ body: { values: [] } }]);
  await action.execute({ issueIdOrKey: "HD-1" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.atlassian.net/rest/servicedeskapi/request/HD-1/status?start=0&limit=50",
  );
});
