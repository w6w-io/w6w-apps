import { assertEquals } from "@std/assert";
import sourceCreate from "../../actions/source-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("source-create: text source body shape", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { id: "s1", type: "text", status: "untrained" } },
  ]);
  await sourceCreate.execute(
    { agentId: "a1", type: "text", name: "Handbook", content: "Employee handbook contents" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/sources");
  assertEquals(JSON.parse(calls[0].body!), {
    type: "text",
    name: "Handbook",
    content: "Employee handbook contents",
  });
});

Deno.test("source-create: qna source parses a JSON string of questions", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "s2", type: "qna" } }]);
  await sourceCreate.execute(
    {
      agentId: "a1",
      type: "qna",
      name: "Refunds",
      questions: '["How do I get a refund?", "What is the refund window?"]',
      answer: "Refunds are processed within 5 business days.",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.type, "qna");
  assertEquals(body.questions, ["How do I get a refund?", "What is the refund window?"]);
});

Deno.test("source-create: link source with excludePaths/includeOnlyPaths as JSON arrays", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "s3", type: "link" } }]);
  await sourceCreate.execute(
    {
      agentId: "a1",
      type: "link",
      url: "https://example.com",
      linkType: "crawl",
      excludePaths: '["/admin"]',
      slowScraping: true,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    type: "link",
    url: "https://example.com",
    linkType: "crawl",
    excludePaths: ["/admin"],
    slowScraping: true,
  });
});
