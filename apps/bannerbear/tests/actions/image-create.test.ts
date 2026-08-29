import { assertEquals } from "@std/assert";
import imageCreate from "../../actions/image-create.ts";
import { API_ROOT, assertRejects, mockCtx, pathOf, SYNC_API_ROOT } from "../_helpers.ts";

Deno.test("image-create: POST /images on the async host by default, modifications defaults to {}", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { uid: "i1", status: "pending" } }]);
  const out = await imageCreate.execute({ template: "t1" }, ctx) as unknown as Record<
    string,
    unknown
  >;

  assertEquals(calls[0].url.startsWith(API_ROOT), true);
  assertEquals(pathOf(calls[0].url), "/images");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.template, "t1");
  assertEquals(body.modifications, {});
  assertEquals(out.uid, "i1");
});

Deno.test("image-create: useSyncHost switches to the sync API root", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { uid: "i1", status: "completed" } }]);
  await imageCreate.execute({ template: "t1", useSyncHost: true }, ctx);

  assertEquals(calls[0].url.startsWith(SYNC_API_ROOT), true);
});

Deno.test("image-create: passes modifications, formats, scale and metadata through", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { uid: "i1" } }]);
  await imageCreate.execute(
    {
      template: "t1",
      modifications: { objects: [{ name: "title", text: "Hi" }] },
      formats: ["png"],
      scale: 2,
      metadata: "order-42",
    },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.modifications, { objects: [{ name: "title", text: "Hi" }] });
  assertEquals(body.formats, ["png"]);
  assertEquals(body.scale, 2);
  assertEquals(body.metadata, "order-42");
});

Deno.test("image-create: requires a template", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => imageCreate.execute({ template: "" }, ctx));
});

Deno.test("image-create: not idempotent", () => {
  assertEquals(imageCreate.idempotent, false);
});
