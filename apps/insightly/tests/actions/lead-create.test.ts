import { assertEquals } from "@std/assert";
import { mockInsightlyCtx } from "../_helpers.ts";
import action from "../../actions/lead-create.ts";

Deno.test("lead-create: POSTs /Leads with the fields", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ status: 201, body: { LEAD_ID: 1 } }]);
  await action.execute({ lastName: "Doe", firstName: "Jo", leadSourceId: 3 }, ctx);
  assertEquals(calls[0].url, "https://api.na1.insightly.com/v3.1/Leads");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    LAST_NAME: "Doe",
    FIRST_NAME: "Jo",
    LEAD_SOURCE_ID: 3,
  });
});

Deno.test("lead-create: only requires lastName", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ status: 201, body: {} }]);
  await action.execute({ lastName: "Doe" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { LAST_NAME: "Doe" });
});
