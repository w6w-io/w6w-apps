import { assertEquals } from "@std/assert";
import { mockJsmCtx } from "../_helpers.ts";
import action from "../../actions/organization-get-many.ts";

Deno.test("organization-get-many: GETs /organization with pagination defaults", async () => {
  const { ctx, calls } = mockJsmCtx([{ body: { values: [] } }]);
  await action.execute({}, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.atlassian.net/rest/servicedeskapi/organization?start=0&limit=50",
  );
});

Deno.test("organization-get-many: filters by accountId when given", async () => {
  const { ctx, calls } = mockJsmCtx([{ body: {} }]);
  await action.execute({ accountId: "acc-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("accountId"), "acc-1");
});
