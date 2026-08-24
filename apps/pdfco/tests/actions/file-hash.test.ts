import { assertEquals } from "@std/assert";
import fileHash from "../../actions/file-hash.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("file-hash: posts to /v1/file/hash and returns a 64-hex-char (SHA-256-length) digest", async () => {
  const hash = "d942e5becdcb0386598cce15e9e56deb1ca9d893b8578a88eca4a62f02c4000b";
  const { ctx, calls } = mockCtx([{ body: { hash, remainingCredits: 98143 } }]);
  const out = await fileHash.execute({ url: "https://example.com/a.pdf" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/file/hash");
  assertEquals(out.hash, hash);
  assertEquals(out.hash?.length, 64, "not the 32 characters an MD5 digest would be");
});
