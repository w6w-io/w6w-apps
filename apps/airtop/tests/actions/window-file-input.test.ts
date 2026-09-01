import { assert, assertEquals, assertRejects } from "@std/assert";
import windowFileInput from "../../actions/window-file-input.ts";
import { aiEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("window-file-input: attaches a file by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: aiEnvelope("File attached.") }]);
  await windowFileInput.execute(
    { sessionId: "s1", windowId: "w1", fileId: "f1", elementDescription: "the file input" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/v1/sessions/s1/windows/w1/file-input");
  assertEquals(JSON.parse(calls[0].body!), { fileId: "f1", elementDescription: "the file input" });
});

Deno.test("window-file-input: requires fileId or fileName, checked before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await windowFileInput.execute({ sessionId: "s1", windowId: "w1" }, ctx),
    Error,
    "fileId or fileName",
  );
  assertEquals(calls.length, 0);
});

Deno.test("window-file-input: is declared non-idempotent", () => {
  assert(windowFileInput.idempotent === false);
});
