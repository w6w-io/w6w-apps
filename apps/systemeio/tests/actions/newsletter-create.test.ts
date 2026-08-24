import { assertEquals } from "@std/assert";
import newsletterCreate from "../../actions/newsletter-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("newsletter-create: POSTs a nested {content} object to /api/mailing/newsletters", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await newsletterCreate.execute(
    { subject: "Hello", editorType: "classic", bodyHtml: "<p>Hi</p>" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/mailing/newsletters");
  assertEquals(
    JSON.parse(calls[0].body!),
    { content: { subject: "Hello", editorType: "classic", bodyHtml: "<p>Hi</p>" } },
  );
});

Deno.test("newsletter-create: content carries only fields actually provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await newsletterCreate.execute({ subject: "Hello" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { content: { subject: "Hello" } });
});
