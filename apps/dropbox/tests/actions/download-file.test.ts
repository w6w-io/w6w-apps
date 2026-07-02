import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/download-file.ts";

Deno.test("download-file: POSTs to content endpoint and returns text + parsed metadata header", async () => {
  const meta = { id: "id:abc", name: "hello.txt", path_display: "/hello.txt" };
  const { ctx, calls } = mockCtx([
    {
      body: "file contents",
      headers: {
        "content-type": "application/octet-stream",
        "Dropbox-API-Result": JSON.stringify(meta),
      },
    },
  ]);

  const result = await action.execute!({ path: "/hello.txt" }, ctx) as {
    content: string;
    encoding: string;
    metadata: unknown;
  };

  assertEquals(calls[0].url, "https://content.dropboxapi.com/2/files/download");
  assertEquals(calls[0].method, "POST");
  const arg = JSON.parse(calls[0].headers["dropbox-api-arg"]);
  assertEquals(arg.path, "/hello.txt");
  assertEquals(result.content, "file contents");
  assertEquals(result.encoding, "utf-8");
  assertEquals(result.metadata, meta);
});

Deno.test("download-file: base64-encodes body when asText=false", async () => {
  const { ctx } = mockCtx([
    {
      body: "AB",
      headers: {
        "content-type": "application/octet-stream",
        "Dropbox-API-Result": JSON.stringify({ id: "x" }),
      },
    },
  ]);
  const result = await action.execute!({ path: "/x.bin", asText: false }, ctx) as {
    content: string;
    encoding: string;
  };
  // btoa("AB") -> "QUI="
  assertEquals(result.encoding, "base64");
  assertEquals(result.content, "QUI=");
});
