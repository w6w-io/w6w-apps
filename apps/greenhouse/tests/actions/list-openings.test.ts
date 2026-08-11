import { assert, assertEquals, assertThrows } from "@std/assert";
import listOpenings from "../../actions/list-openings.ts";
import { listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-openings: calls GET /v3/openings", async () => {
  const { ctx, calls } = mockCtx([listPage([{ id: 1 }])]);
  await listOpenings.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/openings");
});

/**
 * Two id fields with different meanings: `ids` matches Greenhouse's numeric
 * primary key, `opening_id` matches the customer-facing label ("ENG-12"). They
 * are sent as different parameters and must not be collapsed.
 */
Deno.test("list-openings: the label filter and the primary-key filter are separate parameters", async () => {
  const { ctx, calls } = mockCtx([listPage([])]);
  await listOpenings.execute({ openingId: "ENG-12", ids: "500" }, ctx);
  assertEquals(queryOf(calls[0].url), { opening_id: "ENG-12", ids: "500" });
});

Deno.test("list-openings: maps its parent and state filters", async () => {
  const { ctx, calls } = mockCtx([listPage([])]);
  await listOpenings.execute({
    jobIds: "1",
    applicationIds: "2,3",
    closeReasonIds: "4",
    open: true,
    closedAtOperator: "lte",
    closedAt: "2026-01-01T00:00:00Z",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    job_ids: "1",
    application_ids: "2,3",
    close_reason_ids: "4",
    open: "true",
    closed_at: "lte|2026-01-01T00:00:00Z",
  });
});

Deno.test("list-openings: a cursor rejects the open filter it already carries", () => {
  const { ctx } = mockCtx([]);
  const err = assertThrows(() => listOpenings.execute({ cursor: "N", open: true }, ctx), Error);
  assert(err.message.includes("open"), err.message);
});
