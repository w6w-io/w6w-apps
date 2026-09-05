import { assertEquals } from "@std/assert";
import { mockJsmCtx } from "../_helpers.ts";
import action from "../../actions/servicedesk-get-many.ts";

Deno.test("servicedesk-get-many: GETs /servicedesk with pagination defaults", async () => {
  const { ctx, calls } = mockJsmCtx([{
    body: { values: [], size: 0, start: 0, isLastPage: true },
  }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://acme.atlassian.net/rest/servicedeskapi/servicedesk?start=0&limit=50",
  );
});

Deno.test("servicedesk-get-many: honors explicit pagination", async () => {
  const { ctx, calls } = mockJsmCtx([{ body: {} }]);
  await action.execute({ start: 10, limit: 5 }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.atlassian.net/rest/servicedeskapi/servicedesk?start=10&limit=5",
  );
});
