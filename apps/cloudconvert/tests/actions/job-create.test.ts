import { assertEquals, assertRejects } from "@std/assert";
import jobCreate from "../../actions/job-create.ts";
import { envelope, hostOf, mockCtx, pathOf } from "../_helpers.ts";

const JOB = envelope({ id: "j1", status: "processing", tasks: [] });

Deno.test("job-create: POSTs to the async host with tasks/tag/webhook_url", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: JOB }]);
  const out = await jobCreate.execute(
    {
      tasks: { "import-1": { operation: "import/url", url: "https://example.com/a.pdf" } },
      tag: "myjob-123",
      webhookUrl: "https://example.com/hook",
    },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(hostOf(calls[0].url), "api.cloudconvert.com");
  assertEquals(pathOf(calls[0].url), "/v2/jobs");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.tag, "myjob-123");
  assertEquals(body.webhook_url, "https://example.com/hook");
  assertEquals(body.tasks["import-1"].operation, "import/url");
  assertEquals(out.id, "j1");
});

Deno.test("job-create: accepts tasks as a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: JOB }]);
  await jobCreate.execute(
    { tasks: '{"import-1":{"operation":"import/url","url":"https://x"}}' },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.tasks["import-1"].operation, "import/url");
});

Deno.test("job-create: rejects malformed tasks JSON before any request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await jobCreate.execute({ tasks: "{not json" }, ctx),
    Error,
    "Tasks is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("job-create: is declared non-idempotent", () => {
  assertEquals(jobCreate.idempotent, false);
});
