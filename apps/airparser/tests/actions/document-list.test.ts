import { assertEquals } from "@std/assert";
import documentList from "../../actions/document-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("document-list: fetches GET /inboxes/{id}/docs with paging params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await documentList.execute({ inboxId: "in_1", page: 2, perPage: 50 }, ctx);
  assertEquals(pathOf(calls[0].url), "/inboxes/in_1/docs");
  assertEquals(queryOf(calls[0].url), { page: "2", per_page: "50" });
});

Deno.test("document-list: date range and search query are forwarded", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await documentList.execute(
    { inboxId: "in_1", from: "2026-01-01", to: "2026-02-01", q: "invoice" },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), { from: "2026-01-01", to: "2026-02-01", q: "invoice" });
});

Deno.test("document-list: multiple statuses are sent as repeated `status` params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await documentList.execute({ inboxId: "in_1", status: ["parsed", "fail"] }, ctx);
  assertEquals(queryOf(calls[0].url), { status: ["parsed", "fail"] });
});

Deno.test("document-list: omits every unset filter rather than sending empty params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await documentList.execute({ inboxId: "in_1" }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("document-list: search type, per-page default and cap match the vendor's 1-500 range", () => {
  assertEquals(documentList.type, "search");
  const perPage = documentList.params?.find((p) => p.key === "perPage");
  assertEquals(perPage?.default, 25);
  assertEquals(perPage?.validation?.min, 1);
  assertEquals(perPage?.validation?.max, 500);
});
