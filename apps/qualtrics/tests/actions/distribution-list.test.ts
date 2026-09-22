import { assertEquals } from "@std/assert";
import distributionList from "../../actions/distribution-list.ts";
import { API_ROOT, listEnvelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("distribution-list: passes the required surveyId query parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "EMD_1" }]) }]);
  const out = await distributionList.execute({ surveyId: "SV_1" }, ctx) as {
    elements: unknown[];
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith(`${API_ROOT}/distributions`), true, calls[0].url);
  assertEquals(queryOf(calls[0].url), { surveyId: "SV_1" });
  assertEquals(out.elements, [{ id: "EMD_1" }]);
});

Deno.test("distribution-list: follows nextPage while keeping within maxPages", async () => {
  const page2 = "https://iad1.qualtrics.com/API/v3/distributions?surveyId=SV_1&offset=10";
  const { ctx, calls } = mockCtx([
    { body: listEnvelope([{ id: "EMD_1" }], page2) },
    { body: listEnvelope([{ id: "EMD_2" }]) },
  ]);

  const out = await distributionList.execute({ surveyId: "SV_1" }, ctx) as {
    elements: unknown[];
    pages: number;
  };

  assertEquals(calls[1].url, page2);
  assertEquals(out.elements.length, 2);
  assertEquals(out.pages, 2);
});
