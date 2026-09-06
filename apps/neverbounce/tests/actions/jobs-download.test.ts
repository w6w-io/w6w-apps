import { assertEquals, assertRejects } from "@std/assert";
import jobsDownload from "../../actions/jobs-download.ts";
import { mockCtx } from "../_helpers.ts";

const CSV = 'id,email,name,email_status\n"12345","support@neverbounce.com","Fred McValid",valid';

Deno.test("jobs-download: returns the raw CSV body and defaults segmentation flags to include everything", async () => {
  const { ctx, calls } = mockCtx([{ body: CSV, headers: { "content-type": "text/csv" } }]);

  const result = await jobsDownload.execute({ jobId: 123 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4.2/jobs/download");
  assertEquals(url.searchParams.get("job_id"), "123");
  assertEquals(url.searchParams.get("valids"), "1");
  assertEquals(url.searchParams.get("invalids"), "1");
  assertEquals(url.searchParams.get("catchalls"), "1");
  assertEquals(url.searchParams.get("unknowns"), "1");
  assertEquals(url.searchParams.get("disposables"), "1");
  assertEquals(url.searchParams.get("include_duplicates"), "0");
  assertEquals(url.searchParams.has("only_duplicates"), false);
  assertEquals(url.searchParams.has("only_bad_syntax"), false);
  assertEquals(url.searchParams.get("email_status"), "1");
  assertEquals(result.csv, CSV);
});

Deno.test("jobs-download: booleans set to false turn off a segmentation flag", async () => {
  const { ctx, calls } = mockCtx([{ body: CSV, headers: { "content-type": "text/csv" } }]);

  await jobsDownload.execute({ jobId: 1, valids: false, onlyDuplicates: true }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("valids"), "0");
  assertEquals(url.searchParams.get("only_duplicates"), "1");
});

Deno.test("jobs-download: a JSON error body (e.g. auth_failure) is surfaced as an error, not returned as CSV", async () => {
  const { ctx } = mockCtx([
    { body: { status: "auth_failure", message: "Invalid API Key" } },
  ]);

  await assertRejects(
    async () => {
      await jobsDownload.execute({ jobId: 1 }, ctx);
    },
    Error,
    "auth_failure",
  );
});
