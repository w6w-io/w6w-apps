import { assertEquals } from "@std/assert";
import responseExportFileGet from "../../actions/response-export-file-get.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

/** `btoa` over ASCII — the same bytes `encodeBase64` walks out of the response. */
const zipBytes = "PK\u0003\u0004qualtrics-export";

Deno.test("response-export-file-get: downloads the file and base64-encodes it", async () => {
  const { ctx, calls } = mockCtx([
    { body: zipBytes, headers: { "content-type": "application/zip" } },
  ]);
  const out = await responseExportFileGet.execute({ surveyId: "SV_1", fileId: "EF_1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/surveys/SV_1/export-responses/EF_1/file`);
  assertEquals(calls[0].headers.accept, "*/*");
  assertEquals(out.encoding, "base64");
  assertEquals(out.contentType, "application/zip");
  assertEquals(out.content, btoa(zipBytes));
});

Deno.test("response-export-file-get: falls back to a zip content type when none is served", async () => {
  // No body either: a string body makes the Fetch layer invent `text/plain`,
  // which is how a missing content type has to be expressed in a test.
  const { ctx } = mockCtx([{ body: undefined, headers: {} }]);
  const out = await responseExportFileGet.execute({ surveyId: "SV_1", fileId: "EF_1" }, ctx);

  assertEquals(out.contentType, "application/zip");
});
