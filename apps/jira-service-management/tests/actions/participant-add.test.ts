import { assertEquals } from "@std/assert";
import { mockJsmCtx } from "../_helpers.ts";
import action from "../../actions/participant-add.ts";

Deno.test("participant-add: POSTs a trimmed accountIds array", async () => {
  const { ctx, calls } = mockJsmCtx([{ body: { values: [] } }]);
  await action.execute({ issueIdOrKey: "HD-1", accountIds: "acc-1, acc-2 ,acc-3" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.atlassian.net/rest/servicedeskapi/request/HD-1/participant",
  );
  assertEquals(JSON.parse(calls[0].body!), { accountIds: ["acc-1", "acc-2", "acc-3"] });
});
