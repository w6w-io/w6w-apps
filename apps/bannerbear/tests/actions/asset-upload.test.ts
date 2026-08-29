import { assertEquals } from "@std/assert";
import assetUpload from "../../actions/asset-upload.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("asset-upload: POST /assets with the decoded bytes and given content type", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { uid: "a1", url: "https://cdn/a1.png", mime_type: "image/png" } },
  ]);
  const out = await assetUpload.execute(
    { file: "aGVsbG8=", contentType: "image/png" },
    ctx,
  ) as unknown as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/assets");
  assertEquals(calls[0].headers["content-type"], "image/png");
  assertEquals(out.uid, "a1");
});

Deno.test("asset-upload: accepts a data: URI", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { uid: "a1" } }]);
  await assetUpload.execute(
    { file: "data:image/png;base64,aGVsbG8=", contentType: "image/png" },
    ctx,
  );
  assertEquals(calls[0].headers["content-type"], "image/png");
});

Deno.test("asset-upload: requires file and contentType", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => assetUpload.execute({ file: "", contentType: "image/png" }, ctx));
  await assertRejects(() => assetUpload.execute({ file: "aGVsbG8=", contentType: "" }, ctx));
});

Deno.test("asset-upload: idempotent — content hash de-dupes on Bannerbear's side", () => {
  assertEquals(assetUpload.idempotent, true);
});
