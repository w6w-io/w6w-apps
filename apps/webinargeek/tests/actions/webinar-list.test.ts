import { assertEquals } from "@std/assert";
import webinarList from "../../actions/webinar-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("webinar-list: hits GET /webinars with translated snake_case query params", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        total_count: 1,
        webinars: [{ id: 1, title: "My webinar" }],
        pages: { next: null, page: 1, per_page: 50, total_pages: 1 },
      },
    },
  ]);
  const out = await webinarList.execute({
    includePast: true,
    seriesOnly: false,
    language: "en",
    userId: 5,
    departmentId: 2,
    page: 1,
    perPage: 100,
  }, ctx) as { webinars: unknown[]; totalCount: number; totalPages: number };

  assertEquals(pathOf(calls[0].url), "/api/v2/webinars");
  const q = queryOf(calls[0].url);
  assertEquals(q.include_past, "true");
  assertEquals(q.language, "en");
  assertEquals(q.user_id, "5");
  assertEquals(q.department_id, "2");
  assertEquals(q.per_page, "100");
  assertEquals("seriesOnly" in q, false);
  assertEquals(out.webinars, [{ id: 1, title: "My webinar" }]);
  assertEquals(out.totalCount, 1);
  assertEquals(out.totalPages, 1);
});

Deno.test("webinar-list: defaults to an empty array when the account has none", async () => {
  const { ctx } = mockCtx([{ body: { total_count: 0, pages: {} } }]);
  const out = await webinarList.execute({}, ctx) as { webinars: unknown[] };
  assertEquals(out.webinars, []);
});
