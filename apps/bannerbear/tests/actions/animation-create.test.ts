import { assertEquals } from "@std/assert";
import animationCreate from "../../actions/animation-create.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("animation-create: POST /animations, modifications defaults to {}", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { uid: "a1", status: "queued" } }]);
  const out = await animationCreate.execute({ template: "t1" }, ctx) as unknown as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/animations");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.template, "t1");
  assertEquals(body.modifications, {});
  assertEquals(out.uid, "a1");
});

Deno.test("animation-create: passes formats and metadata through", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { uid: "a1" } }]);
  await animationCreate.execute(
    { template: "t1", formats: ["mov"], metadata: "job-1" },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.formats, ["mov"]);
  assertEquals(body.metadata, "job-1");
});

Deno.test("animation-create: requires a template", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => animationCreate.execute({ template: "" }, ctx));
});
