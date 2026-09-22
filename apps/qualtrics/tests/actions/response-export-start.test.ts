import { assert, assertEquals } from "@std/assert";
import responseExportStart from "../../actions/response-export-start.ts";
import { API_ROOT, envelope, mockCtx } from "../_helpers.ts";

Deno.test("response-export-start: POSTs the required format body to export-responses", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ progressId: "ES_1", percentComplete: 0, status: "inProgress" }) },
  ]);
  const out = await responseExportStart.execute({ surveyId: "SV_1", format: "csv" }, ctx) as {
    progressId: string;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/surveys/SV_1/export-responses`);
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ format: "csv" }));
  assertEquals(out.progressId, "ES_1");
});

Deno.test("response-export-start: format defaults to json", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ progressId: "ES_1" }) }]);
  await responseExportStart.execute({ surveyId: "SV_1" }, ctx);

  assertEquals(calls[0].body, JSON.stringify({ format: "json" }));
});

/**
 * Each call starts a fresh job and returns a new progressId. Marking it
 * retryable would turn one dropped connection into two exports.
 */
Deno.test("response-export-start: is a perform that is not idempotent", () => {
  assertEquals(responseExportStart.type, "perform");
  assertEquals(responseExportStart.idempotent, false);
});

Deno.test("response-export-start: only the verified format field is sent", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ progressId: "ES_1" }) }]);
  await responseExportStart.execute({ surveyId: "SV_1", format: "json" }, ctx);

  assert(calls[0].body !== null);
  assertEquals(Object.keys(JSON.parse(calls[0].body!)), ["format"]);
});
