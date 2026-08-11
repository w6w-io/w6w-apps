import { assert, assertEquals, assertThrows } from "@std/assert";
import listOffers from "../../actions/list-offers.ts";
import { offerStatusOptions } from "../../lib/params.ts";
import { listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-offers: calls GET /v3/offers", async () => {
  const { ctx, calls } = mockCtx([listPage([{ id: 1 }])]);
  await listOffers.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/offers");
});

/**
 * Offer statuses are Capitalised, unlike every other status vocabulary in this
 * API. Sending `accepted` is a 422, so the exact casing is pinned.
 */
Deno.test("list-offers: the status vocabulary is capitalised", () => {
  assertEquals(offerStatusOptions.map((o) => o.value), [
    "Created",
    "Accepted",
    "Rejected",
    "Deprecated",
  ]);
});

Deno.test("list-offers: maps its parent filters and the current-version switch", async () => {
  const { ctx, calls } = mockCtx([listPage([])]);
  await listOffers.execute({
    applicationIds: "1",
    jobIds: "2",
    candidateIds: "3",
    openingIds: "4",
    status: "Accepted",
    currentOnly: true,
    startsOnOperator: "gte",
    startsOn: "2026-09-01T00:00:00Z",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    application_ids: "1",
    job_ids: "2",
    candidate_ids: "3",
    opening_ids: "4",
    status: "Accepted",
    current_only: "true",
    starts_on: "gte|2026-09-01T00:00:00Z",
  });
});

Deno.test("list-offers: the current-version hint warns that offers are versioned", () => {
  const param = (listOffers.params ?? []).find((p) => p.key === "currentOnly");
  assert(param?.hint?.includes("versioned"), param?.hint);
});

Deno.test("list-offers: a cursor rejects the status it already carries", () => {
  const { ctx } = mockCtx([]);
  const err = assertThrows(
    () => listOffers.execute({ cursor: "N", status: "Created" }, ctx),
    Error,
  );
  assert(err.message.includes("status"), err.message);
});
