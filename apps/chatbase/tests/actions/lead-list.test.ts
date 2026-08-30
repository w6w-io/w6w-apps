import { assertEquals, assertRejects } from "@std/assert";
import leadList from "../../actions/lead-list.ts";
import { API_V1_ROOT, mockCtx, pathOf, queryOf, v1ErrorBody } from "../_helpers.ts";

Deno.test("lead-list: GET /api/v1/get-leads, not /api/v2", async () => {
  const { ctx, calls } = mockCtx([{ body: { collectedCustomers: [{ id: "lead_1" }] } }]);
  const out = await leadList.execute({ chatbotId: "cb1" }, ctx) as {
    collectedCustomers: unknown[];
  };

  assertEquals(calls[0].url.startsWith(API_V1_ROOT), true, calls[0].url);
  assertEquals(pathOf(calls[0].url), "/api/v1/get-leads");
  assertEquals(out.collectedCustomers.length, 1);
});

Deno.test("lead-list: forwards chatbotId, date range, and pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: { collectedCustomers: [] } }]);
  await leadList.execute(
    { chatbotId: "cb1", startDate: "2026-01-01", endDate: "2026-01-31", page: 2, size: 25 },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {
    chatbotId: "cb1",
    startDate: "2026-01-01",
    endDate: "2026-01-31",
    page: "2",
    size: "25",
  });
});

Deno.test("lead-list: surfaces v1's {message} error shape (no machine code)", async () => {
  const { ctx } = mockCtx([{ status: 401, body: v1ErrorBody("No API key provided.") }]);
  const err = await assertRejects(
    () => Promise.resolve(leadList.execute({ chatbotId: "cb1" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("No API key provided."), true, err.message);
});
