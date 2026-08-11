import { assert, assertEquals, assertThrows } from "@std/assert";
import listCandidates from "../../actions/list-candidates.ts";
import { listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-candidates: calls GET /v3/candidates and returns the bare array", async () => {
  const { ctx, calls } = mockCtx([listPage([{ id: 2 }, { id: 1 }])]);
  const page = await listCandidates.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v3/candidates");
  assertEquals(page.items.length, 2);
  assertEquals(page.hasMore, false);
});

Deno.test("list-candidates: maps its filters onto the vendor's snake_case names", async () => {
  const { ctx, calls } = mockCtx([listPage([])]);
  await listCandidates.execute({
    email: "a@b.com",
    tag: "referral",
    isPrivate: true,
    customFieldOptionId: 7,
    perPage: 25,
    ids: "1,2",
    fields: "id,first_name",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    email: "a@b.com",
    tag: "referral",
    private: "true",
    custom_field_option_id: "7",
    per_page: "25",
    ids: "1,2",
    fields: "id,first_name",
  });
});

/** `created_at=gte|<iso>`, not a bracketed sub-key and not a bare timestamp. */
Deno.test("list-candidates: date filters use the pipe-delimited operator form", async () => {
  const { ctx, calls } = mockCtx([listPage([])]);
  await listCandidates.execute({
    createdAtOperator: "gte",
    createdAt: "2026-01-01T00:00:00Z",
    lastActivityAtOperator: "lt",
    lastActivityAt: "2026-02-01T00:00:00Z",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    created_at: "gte|2026-01-01T00:00:00Z",
    last_activity_at: "lt|2026-02-01T00:00:00Z",
  });
});

Deno.test("list-candidates: the header-borne cursor is returned for the next step", async () => {
  const { ctx } = mockCtx([listPage([{ id: 1 }], "NEXT")]);
  const page = await listCandidates.execute({}, ctx);
  assertEquals(page.nextCursor, "NEXT");
  assertEquals(page.hasMore, true);
  assert(page.nextUrl?.includes("cursor=NEXT"));
});

/** Greenhouse answers 422 for a cursor sent with anything else. */
Deno.test("list-candidates: a cursor combined with a filter fails locally", () => {
  const { ctx } = mockCtx([]);
  const err = assertThrows(
    () => listCandidates.execute({ cursor: "NEXT", email: "a@b.com" }, ctx),
    Error,
  );
  assert(err.message.includes("email"), err.message);
});

Deno.test("list-candidates: a lone cursor is sent as the only parameter", async () => {
  const { ctx, calls } = mockCtx([listPage([])]);
  await listCandidates.execute({ cursor: "NEXT" }, ctx);
  assertEquals(queryOf(calls[0].url), { cursor: "NEXT" });
});
