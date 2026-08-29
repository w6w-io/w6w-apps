import { assertEquals } from "@std/assert";
import jobCreateAndWait from "../../actions/job-create-and-wait.ts";
import { envelope, hostOf, mockCtx, pathOf } from "../_helpers.ts";

const FINISHED_JOB = envelope({ id: "j1", status: "finished", tasks: [] });

Deno.test("job-create-and-wait: POSTs to the SYNC host, not the async one", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: FINISHED_JOB }]);
  const out = await jobCreateAndWait.execute(
    { tasks: { "import-1": { operation: "import/url", url: "https://example.com/a.pdf" } } },
    ctx,
  ) as { status: string };

  assertEquals(hostOf(calls[0].url), "sync.api.cloudconvert.com");
  assertEquals(pathOf(calls[0].url), "/v2/jobs");
  assertEquals(calls[0].method, "POST");
  assertEquals(out.status, "finished");
});

Deno.test("job-create-and-wait: is declared non-idempotent", () => {
  assertEquals(jobCreateAndWait.idempotent, false);
});

Deno.test("job-create-and-wait: exposes no redirect param (undeclared storage.cloudconvert.com egress)", () => {
  const keys = jobCreateAndWait.params?.map((p) => p.key) ?? [];
  assertEquals(keys.includes("redirect"), false);
});
