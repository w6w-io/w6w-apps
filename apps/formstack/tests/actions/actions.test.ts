import { assert, assertEquals, assertRejects } from "@std/assert";
import formList from "../../actions/form-list.ts";
import formGet from "../../actions/form-get.ts";
import formFields from "../../actions/form-fields.ts";
import folderList from "../../actions/folder-list.ts";
import submissionList from "../../actions/submission-list.ts";
import submissionCount from "../../actions/submission-count.ts";
import submissionGet from "../../actions/submission-get.ts";
import submissionCreate from "../../actions/submission-create.ts";
import submissionDelete from "../../actions/submission-delete.ts";
import { errorBody, mockFormstackCtx } from "../_helpers.ts";

/**
 * The pagination names differ per endpoint and the wrong pair is silently
 * ignored, so each is pinned against the vendor's own OpenAPI fragment.
 */
Deno.test("form-list: pages with pageNumber/pageSize", async () => {
  const { ctx, calls } = mockFormstackCtx([{ body: { data: [] } }]);
  await formList.execute(
    { search: "intake", folder: "9", orderBy: "name", order: "asc", pageNumber: 2, pageSize: 50 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2025/forms");
  assertEquals(url.searchParams.get("pageNumber"), "2");
  assertEquals(url.searchParams.get("pageSize"), "50");
  assertEquals(url.searchParams.get("page"), null, "the other spelling must not be sent");
  assertEquals(url.searchParams.get("search"), "intake");
  assertEquals(url.searchParams.get("folder"), "9");
});

Deno.test("folder-list: pages with page/perPage — the OTHER spelling", async () => {
  const { ctx, calls } = mockFormstackCtx([{ body: { data: [] } }]);
  await folderList.execute({ page: 2, perPage: 25 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2025/folders");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("perPage"), "25");
  assertEquals(url.searchParams.get("pageNumber"), null);
});

Deno.test("form-get and form-fields: build the form-scoped paths", async () => {
  const { ctx, calls } = mockFormstackCtx([{ body: {} }, { body: { data: [] } }]);
  await formGet.execute({ formId: "12345" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2025/forms/12345");
  await formFields.execute({ formId: "12345" }, ctx);
  assertEquals(new URL(calls[1].url).pathname, "/api/v2025/forms/12345/fields");
});

/**
 * The default that matters most: without `data=true` a submission carries only
 * metadata, and a workflow reading answers finds nothing.
 */
Deno.test("submission-list: asks for field data by default", async () => {
  const { ctx, calls } = mockFormstackCtx([{ body: { data: [] } }]);
  await submissionList.execute({ formId: "12345" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2025/forms/12345/submissions");
  assertEquals(url.searchParams.get("data"), "true");
});

Deno.test("submission-list: an explicit false is honoured", async () => {
  const { ctx, calls } = mockFormstackCtx([{ body: { data: [] } }]);
  await submissionList.execute({ formId: "12345", data: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("data"), "false");
});

Deno.test("submission-list: maps the search, date and paging parameters", async () => {
  const { ctx, calls } = mockFormstackCtx([{ body: { data: [] } }]);
  await submissionList.execute({
    formId: "12345",
    keyword: "ada",
    minTime: "2026-08-01 00:00:00",
    maxTime: "2026-08-31 23:59:59",
    order: "DESC",
    expandData: true,
    prettyName: true,
    dataFormat: "legacy",
    pageNumber: 3,
    pageSize: 100,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("keyword"), "ada");
  assertEquals(url.searchParams.get("minTime"), "2026-08-01 00:00:00");
  assertEquals(url.searchParams.get("maxTime"), "2026-08-31 23:59:59");
  assertEquals(url.searchParams.get("order"), "DESC");
  assertEquals(url.searchParams.get("expandData"), "true");
  assertEquals(url.searchParams.get("prettyName"), "true");
  assertEquals(url.searchParams.get("dataFormat"), "legacy");
  assertEquals(url.searchParams.get("pageNumber"), "3");
  assertEquals(url.searchParams.get("pageSize"), "100");
});

/** `search` is a dynamically-named parameter per field — no form can express it. */
Deno.test("submission-list: expands field search into search[fieldId] parameters", async () => {
  const { ctx, calls } = mockFormstackCtx([{ body: { data: [] } }]);
  await submissionList.execute(
    { formId: "12345", fieldSearch: '{"111":"ada@example.com","222":"UK"}' },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("search[111]"), "ada@example.com");
  assertEquals(url.searchParams.get("search[222]"), "UK");
});

Deno.test("submission-list: names bad field-search JSON rather than sending it", async () => {
  const { ctx, calls } = mockFormstackCtx([]);
  await assertRejects(
    async () => {
      await submissionList.execute({ formId: "1", fieldSearch: "{nope" }, ctx);
    },
    Error,
    "Field search is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("submission-count: hits the count path without fetching submissions", async () => {
  const { ctx, calls } = mockFormstackCtx([{ body: { count: 42 } }]);
  const out = await submissionCount.execute({ formId: "12345" }, ctx) as { count?: number };
  assertEquals(new URL(calls[0].url).pathname, "/api/v2025/forms/12345/submissions/count");
  assertEquals(out.count, 42);
});

/** Submissions are addressed globally by their own id — no form id in the path. */
Deno.test("submission-get and submission-delete: address the submission directly", async () => {
  const { ctx, calls } = mockFormstackCtx([{ body: { id: "77" } }, { status: 204 }]);
  await submissionGet.execute({ submissionId: "77", expandData: true }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v2025/submissions/77");
  assertEquals(new URL(calls[0].url).searchParams.get("expandData"), "true");

  await submissionDelete.execute({ submissionId: "77" }, ctx);
  assertEquals(calls[1].method, "DELETE");
  assertEquals(new URL(calls[1].url).pathname, "/api/v2025/submissions/77");
});

Deno.test("submission-create: posts the field object as JSON, keyed by field id", async () => {
  const { ctx, calls } = mockFormstackCtx([{ body: { id: "88" } }]);
  await submissionCreate.execute(
    { formId: "12345", fields: '{"111":"Ada","222":"ada@example.com"}' },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v2025/forms/12345/submissions");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { "111": "Ada", "222": "ada@example.com" });
});

Deno.test("submission-create: refuses a non-object or empty payload before sending", async () => {
  const { ctx, calls } = mockFormstackCtx([]);
  await assertRejects(
    async () => {
      await submissionCreate.execute({ formId: "1", fields: '["Ada"]' }, ctx);
    },
    Error,
    "object keyed by field id",
  );
  await assertRejects(
    async () => {
      await submissionCreate.execute({ formId: "1", fields: "{}" }, ctx);
    },
    Error,
    "empty",
  );
  assertEquals(calls.length, 0);
});

/** A form submission is a real response from a real person; a retry records two. */
Deno.test("submission-create: is not idempotent", () => {
  assertEquals(submissionCreate.idempotent, false);
});

Deno.test("actions: the daily quota surfaces as a day-long wall, not a moment's throttle", async () => {
  const { ctx } = mockFormstackCtx([{ status: 429, body: errorBody("Rate limit exceeded") }]);
  const err = await assertRejects(async () => {
    await formList.execute({}, ctx);
  }, Error);
  assert(err.message.includes("daily API quota"), err.message);
});
