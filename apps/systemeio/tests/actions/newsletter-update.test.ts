import { assertEquals } from "@std/assert";
import newsletterUpdate from "../../actions/newsletter-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("newsletter-update: merge-patches a nested {content} object", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await newsletterUpdate.execute({ id: "1", subject: "Updated subject" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/mailing/newsletters/1");
  assertEquals(calls[0].headers["content-type"], "application/merge-patch+json");
  assertEquals(JSON.parse(calls[0].body!), { content: { subject: "Updated subject" } });
});
