import { assertEquals } from "@std/assert";
import formUpdate from "../../actions/form-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("form-update: merges the raw Body(JSON) passthrough with the typed fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { form_id: "f1", title: "New title" } }]);
  await formUpdate.execute(
    {
      formId: "f1",
      title: "New title",
      body: { metadata: { locale: "en-US" } },
    },
    ctx,
  );
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/forms/f1");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { metadata: { locale: "en-US" }, title: "New title" });
});

Deno.test("form-update: typed fields win over a colliding raw Body(JSON) key", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await formUpdate.execute(
    { formId: "f1", title: "typed wins", body: { title: "from body" } },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.title, "typed wins");
});

Deno.test("form-update: with no fields set, sends an empty body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await formUpdate.execute({ formId: "f1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});
