import { assertEquals } from "@std/assert";
import pushCreate from "../../actions/push-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("push-create: POSTs a note push with a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { iden: "p1", type: "note" } }]);
  const out = await pushCreate.execute(
    { type: "note", title: "Hi", body: "there" },
    ctx,
  ) as { iden: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/pushes");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { type: "note", title: "Hi", body: "there" });
  assertEquals(out.iden, "p1");
});

Deno.test("push-create: omits target fields that were not supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { iden: "p2" } }]);
  await pushCreate.execute({ type: "link", url: "https://example.com" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { type: "link", url: "https://example.com" });
  assertEquals("device_iden" in body, false);
  assertEquals("channel_tag" in body, false);
});

Deno.test("push-create: is declared non-idempotent — guid is optional", () => {
  assertEquals(pushCreate.idempotent, false);
});

Deno.test("push-create: maps camelCase target fields to their wire names", async () => {
  const { ctx, calls } = mockCtx([{ body: { iden: "p3" } }]);
  await pushCreate.execute(
    {
      type: "file",
      deviceIden: "d1",
      fileName: "a.jpg",
      fileType: "image/jpeg",
      fileUrl: "https://x/a.jpg",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.device_iden, "d1");
  assertEquals(body.file_name, "a.jpg");
  assertEquals(body.file_type, "image/jpeg");
  assertEquals(body.file_url, "https://x/a.jpg");
});
