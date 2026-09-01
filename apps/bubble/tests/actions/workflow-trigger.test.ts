import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/workflow-trigger.ts";

const display = { baseUrl: "https://myapp.bubbleapps.io" };

Deno.test("workflow-trigger: POST sends params as a JSON body", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { status: "success" } },
  ], { display });

  await action.execute({
    workflowName: "generate-api-token",
    httpMethod: "POST",
    params: { email: "a@b.com" },
  }, ctx);

  assertEquals(calls[0].url, "https://myapp.bubbleapps.io/api/1.1/wf/generate-api-token");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.com" });
});

Deno.test("workflow-trigger: GET sends params as a query string, no body", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { status: "success" } },
  ], { display });

  await action.execute({
    workflowName: "url-friendly-name",
    httpMethod: "GET",
    params: { count: 3 },
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  assertEquals(url.searchParams.get("count"), "3");
});

Deno.test("workflow-trigger: a plain-text response is returned as text", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: "ok", headers: { "content-type": "text/plain" } },
  ], { display });
  const out = await action.execute({ workflowName: "ping", httpMethod: "POST" }, ctx);
  assertEquals(out, "ok");
});

Deno.test("workflow-trigger: rejects params that are not a JSON object", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => {
    await action.execute({ workflowName: "w", httpMethod: "POST", params: "[1,2]" }, ctx);
  });
});
