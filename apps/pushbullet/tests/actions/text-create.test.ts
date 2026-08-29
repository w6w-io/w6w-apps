import { assertEquals } from "@std/assert";
import textCreate from "../../actions/text-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("text-create: POSTs a nested data object to /v2/texts", async () => {
  const { ctx, calls } = mockCtx([{ body: { iden: "t1" } }]);
  await textCreate.execute(
    {
      targetDeviceIden: "d1",
      addresses: ["+13035551212"],
      message: "hi",
      guid: "g1",
    },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/texts");
  assertEquals(JSON.parse(calls[0].body!), {
    data: {
      target_device_iden: "d1",
      addresses: ["+13035551212"],
      message: "hi",
      guid: "g1",
    },
  });
});

Deno.test("text-create: attaches a file via file_url alongside data", async () => {
  const { ctx, calls } = mockCtx([{ body: { iden: "t2" } }]);
  await textCreate.execute(
    {
      targetDeviceIden: "d1",
      addresses: ["+13035551212"],
      fileUrl: "https://dl.pushbulletusercontent.com/x/john.jpg",
      fileType: "image/jpeg",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.file_url, "https://dl.pushbulletusercontent.com/x/john.jpg");
  assertEquals(body.data.file_type, "image/jpeg");
});

Deno.test("text-create: is declared non-idempotent — guid is optional", () => {
  assertEquals(textCreate.idempotent, false);
});
