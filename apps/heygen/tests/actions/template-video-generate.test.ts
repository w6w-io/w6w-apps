import { assert, assertEquals } from "@std/assert";
import templateVideoGenerate from "../../actions/template-video-generate.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-video-generate: posts to the template's own path with parsed variables", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "v1", status: "pending" }) }]);
  const out = await templateVideoGenerate.execute(
    {
      templateId: "tpl_1",
      variables: '{"headline": {"type": "text", "text": "Q3 Results"}}',
      caption: true,
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v3/templates/tpl_1");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables, { headline: { type: "text", text: "Q3 Results" } });
  assertEquals(body.caption, true);
  assertEquals(out, { id: "v1", status: "pending" });
});

Deno.test("template-video-generate: sends an empty variables object when none are given, since the field is required", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "v1", status: "pending" }) }]);
  await templateVideoGenerate.execute({ templateId: "tpl_1" }, ctx);

  const body = JSON.parse(calls[0].body!);
  assert("variables" in body);
  assertEquals(body.variables, {});
});

Deno.test("template-video-generate: an already-parsed variables object is accepted as-is", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "v1", status: "pending" }) }]);
  await templateVideoGenerate.execute(
    { templateId: "tpl_1", variables: { headline: { type: "text", text: "Hi" } } },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables, { headline: { type: "text", text: "Hi" } });
});
