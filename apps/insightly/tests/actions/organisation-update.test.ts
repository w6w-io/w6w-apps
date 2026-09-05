import { assertEquals } from "@std/assert";
import { mockInsightlyCtx } from "../_helpers.ts";
import action from "../../actions/organisation-update.ts";

Deno.test("organisation-update: PUTs /Organisations with the id and only set fields", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ status: 201, body: { ORGANISATION_ID: 1 } }]);
  await action.execute({ organisationId: 1, phone: "555-1234" }, ctx);
  assertEquals(calls[0].url, "https://api.na1.insightly.com/v3.1/Organisations");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { ORGANISATION_ID: 1, PHONE: "555-1234" });
});
