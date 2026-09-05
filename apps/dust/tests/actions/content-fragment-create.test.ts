import { assertEquals } from "@std/assert";
import contentFragmentCreate from "../../actions/content-fragment-create.ts";
import { mockCtxWithConnection, pathOf } from "../_helpers.ts";

Deno.test("content-fragment-create: posts title/content/contentType, defaulting contentType", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ body: { title: "Notes" } }]);
  await contentFragmentCreate.execute(
    { cId: "c1", title: "Notes", content: "some text" },
    ctx,
  );

  assertEquals(
    pathOf(calls[0].url),
    `/api/v1/w/${ctx.connection?.display?.workspaceId}/assistant/conversations/c1/content_fragments`,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { title: "Notes", content: "some text", contentType: "text/plain" });
});

Deno.test("content-fragment-create: honours an explicit contentType and url", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ body: {} }]);
  await contentFragmentCreate.execute(
    {
      cId: "c1",
      title: "Report",
      content: "a,b\n1,2",
      contentType: "text/csv",
      url: "https://example.com/report.csv",
    },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.contentType, "text/csv");
  assertEquals(body.url, "https://example.com/report.csv");
});

Deno.test("content-fragment-create: is declared non-idempotent", () => {
  assertEquals(contentFragmentCreate.idempotent, false);
});
