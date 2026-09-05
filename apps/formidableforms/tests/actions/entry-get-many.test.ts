import { assertEquals } from "@std/assert";
import { BASE_PATH, DISPLAY, mockCtx, paramsOf } from "../_helpers.ts";
import action from "../../actions/entry-get-many.ts";

Deno.test("entry-get-many: uses the form-scoped route when a Form ID is given", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display: DISPLAY });
  await action.execute({ formId: 25 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/forms/25/entries`);
});

Deno.test("entry-get-many: falls back to the bare /entries route with no Form ID", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display: DISPLAY });
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/entries`);
});

Deno.test("entry-get-many: sends date, search, sort and is_draft filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display: DISPLAY });
  await action.execute({ date: "2026-09-01", search: "jane", sort: "id", isDraft: true }, ctx);
  const params = paramsOf(calls);
  assertEquals(params.get("date"), "2026-09-01");
  assertEquals(params.get("search"), "jane");
  assertEquals(params.get("sort"), "id");
  assertEquals(params.get("is_draft"), "true");
});

Deno.test("entry-get-many: omits unset filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display: DISPLAY });
  await action.execute({}, ctx);
  assertEquals([...paramsOf(calls).keys()].length, 0);
});
