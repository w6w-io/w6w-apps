import { assertEquals } from "@std/assert";
import { mockJsmCtx } from "../_helpers.ts";
import action from "../../actions/requesttype-get-many.ts";

Deno.test("requesttype-get-many: GETs request types under the service desk", async () => {
  const { ctx, calls } = mockJsmCtx([{ body: { values: [] } }]);
  await action.execute({ serviceDeskId: "10" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.atlassian.net/rest/servicedeskapi/servicedesk/10/requesttype?start=0&limit=50",
  );
});

Deno.test("requesttype-get-many: forwards searchQuery and groupId when set", async () => {
  const { ctx, calls } = mockJsmCtx([{ body: {} }]);
  await action.execute({ serviceDeskId: "10", searchQuery: "printer", groupId: "3" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("searchQuery"), "printer");
  assertEquals(url.searchParams.get("groupId"), "3");
});
