import { assert, assertEquals } from "@std/assert";
import fileGet from "../../actions/file-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const FILE = {
  file_id: 555,
  name: "contract.pdf",
  mimetype: "application/pdf",
  size: 12345,
  link: "https://files.podio.com/555",
  perma_link: "https://podio.com/file/555",
  thumbnail_link: "https://files.podio.com/555/thumb",
  push: { channel: "/file/555", signature: "sig", timestamp: 1 },
};

Deno.test("file-get: GETs the file metadata", async () => {
  const { ctx, calls } = mockCtx([{ body: FILE }]);
  const out = await fileGet.execute({ fileId: "555" }, ctx) as { file: Record<string, unknown> };
  assertEquals(pathOf(calls[0].url), "/file/555");
  assertEquals(out.file.name, "contract.pdf");
  assertEquals(out.file.link, "https://files.podio.com/555");
});

/** One request only — this action returns links, it does not follow them. */
Deno.test("file-get: never follows the download link", async () => {
  const { ctx, calls } = mockCtx([{ body: FILE }]);
  await fileGet.execute({ fileId: "555" }, ctx);
  assertEquals(calls.length, 1);
  assert((fileGet.description ?? "").includes("Returns links, not bytes"));
});

Deno.test("file-get: the push channel signature is stripped", async () => {
  const { ctx } = mockCtx([{ body: FILE }]);
  const out = await fileGet.execute({ fileId: "555" }, ctx) as { file: Record<string, unknown> };
  assertEquals(out.file.push, undefined);
});

Deno.test("file-get: an empty body yields an empty object", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await fileGet.execute({ fileId: "555" }, ctx), { file: {} });
});
