import { assertEquals } from "@std/assert";
import { mockGorgiasCtx } from "../_helpers.ts";
import action from "../../actions/tag-create.ts";

Deno.test("tag-create: POSTs /tags with name and description", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: { id: 1, name: "urgent" } }]);
  await action.execute({ name: "urgent", description: "Mark as urgent" }, ctx);
  assertEquals(calls[0].url, "https://acme.gorgias.com/api/tags");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "urgent");
  assertEquals(body.description, "Mark as urgent");
  assertEquals(body.decoration, undefined);
});

Deno.test("tag-create: wraps a color into the decoration object", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: {} }]);
  await action.execute({ name: "urgent", color: "#F58D86" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).decoration, { color: "#F58D86" });
});
