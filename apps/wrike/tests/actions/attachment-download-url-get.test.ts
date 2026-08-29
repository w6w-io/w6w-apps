import { assertEquals } from "@std/assert";
import attachmentDownloadUrlGet from "../../actions/attachment-download-url-get.ts";
import { envelope, mockWrikeCtx, pathOf } from "../_helpers.ts";

Deno.test("attachment-download-url-get: GETs /attachments/{attachmentId}/url", async () => {
  const { ctx, calls } = mockWrikeCtx([
    {
      status: 200,
      body: envelope([{ url: "https://www.wrike.com/attachments/A1/download/x.pdf" }]),
    },
  ]);
  const out = await attachmentDownloadUrlGet.execute({ attachmentId: "A1" }, ctx) as {
    url: string;
  };
  assertEquals(pathOf(calls[0].url), "/api/v4/attachments/A1/url");
  assertEquals(out.url, "https://www.wrike.com/attachments/A1/download/x.pdf");
});

Deno.test("attachment-download-url-get: the 24-hour validity is documented on the action", () => {
  assertEquals(attachmentDownloadUrlGet.description?.includes("24 hours"), true);
});
