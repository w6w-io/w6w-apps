import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-template.ts";

Deno.test("create-template: POSTs /templates/ with name, editor_type, html/text", async () => {
  const body = { data: { type: "template", id: "t-1" } };
  const { ctx, calls } = mockCtx([{ status: 201, body }]);
  await action.execute!(
    { name: "Welcome", html: "<p>hi</p>", text: "hi" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/api/templates/");
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.data.type, "template");
  assertEquals(sent.data.attributes.name, "Welcome");
  assertEquals(sent.data.attributes.editor_type, "CODE");
  assertEquals(sent.data.attributes.html, "<p>hi</p>");
  assertEquals(sent.data.attributes.text, "hi");
});
