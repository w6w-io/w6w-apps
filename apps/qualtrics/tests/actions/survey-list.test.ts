import { assertEquals } from "@std/assert";
import surveyList from "../../actions/survey-list.ts";
import { API_ROOT, listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("survey-list: calls GET /surveys and flattens result.elements", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "SV_1" }, { id: "SV_2" }]) }]);
  const out = await surveyList.execute({}, ctx) as { elements: unknown[]; count: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/surveys`);
  assertEquals(out.elements, [{ id: "SV_1" }, { id: "SV_2" }]);
  assertEquals(out.count, 2);
});

Deno.test("survey-list: follows result.nextPage verbatim and concatenates the pages", async () => {
  const page2 = "https://iad1.qualtrics.com/API/v3/surveys?offset=100&limit=100";
  const { ctx, calls } = mockCtx([
    { body: listEnvelope([{ id: "SV_1" }], page2) },
    { body: listEnvelope([{ id: "SV_2" }]) },
  ]);

  const out = await surveyList.execute({}, ctx) as { elements: unknown[]; pages: number };

  assertEquals(calls.length, 2);
  assertEquals(calls[1].url, page2);
  assertEquals(out.elements, [{ id: "SV_1" }, { id: "SV_2" }]);
  assertEquals(out.pages, 2);
});

Deno.test("survey-list: stops at maxPages and reports the remaining nextPage", async () => {
  const page2 = "https://iad1.qualtrics.com/API/v3/surveys?offset=100&limit=100";
  const { ctx, calls } = mockCtx([
    { body: listEnvelope([{ id: "SV_1" }], page2) },
  ]);

  const out = await surveyList.execute({ maxPages: 1 }, ctx) as {
    pages: number;
    nextPage?: string;
  };

  assertEquals(calls.length, 1);
  assertEquals(out.pages, 1);
  assertEquals(out.nextPage, page2);
});

Deno.test("survey-list: one page with no nextPage costs exactly one request", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  const out = await surveyList.execute({}, ctx) as { nextPage?: string };

  assertEquals(calls.length, 1);
  assertEquals(out.nextPage, undefined);
});

Deno.test("survey-list: prefills a bounded maxPages", () => {
  const maxPages = surveyList.params?.find((p) => p.key === "maxPages");
  assertEquals(maxPages?.default, 10);
});

Deno.test("survey-list: the URL is built against the connection's datacenter", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await surveyList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/API/v3/surveys");
  assertEquals(calls[0].url.startsWith(`${API_ROOT}/surveys`), true, calls[0].url);
});
