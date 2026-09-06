import { assert, assertEquals } from "@std/assert";
import { checkWhoami, fetchWhoami } from "../../auth/whoami.ts";
import { matrixError, mockCtx } from "../_helpers.ts";

Deno.test("checkWhoami: ok when the body carries a user_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { user_id: "@alice:example.org", device_id: "ABC" } }]);
  const result = await checkWhoami(ctx, "https://matrix.example.org", "tok123");
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, "https://matrix.example.org/_matrix/client/v3/account/whoami");
  assertEquals(calls[0].headers["authorization"], "Bearer tok123");
});

Deno.test("checkWhoami: a 401 is only 'the token is dead' when errcode says M_UNKNOWN_TOKEN", async () => {
  const known = mockCtx([{ status: 401, body: matrixError("M_UNKNOWN_TOKEN", "bad token") }]);
  const knownResult = await checkWhoami(known.ctx, "https://matrix.example.org", "tok");
  assertEquals(knownResult.ok, false);
  const knownMessage = knownResult.ok ? "" : knownResult.message;
  assert(knownMessage.includes("M_UNKNOWN_TOKEN"), knownMessage);

  const other = mockCtx([{ status: 401, body: matrixError("M_UNAUTHORIZED", "soft logout") }]);
  const otherResult = await checkWhoami(other.ctx, "https://matrix.example.org", "tok");
  assertEquals(otherResult.ok, false);
  const otherMessage = otherResult.ok ? "" : otherResult.message;
  assert(otherMessage.includes("401"), otherMessage);
});

Deno.test("checkWhoami: a 404 is diagnosed as a wrong homeserver URL", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }]);
  const result = await checkWhoami(ctx, "https://matrix.example.org", "tok");
  assertEquals(result.ok, false);
  const message = result.ok ? "" : result.message;
  assert(message.includes("check the homeserver URL"), message);
});

Deno.test("fetchWhoami: returns the parsed body, or null on any failure", async () => {
  const ok = mockCtx([{ body: { user_id: "@alice:example.org", device_id: "ABC" } }]);
  assertEquals(await fetchWhoami(ok.ctx, "https://matrix.example.org", "tok"), {
    user_id: "@alice:example.org",
    device_id: "ABC",
  });

  const bad = mockCtx([{ status: 401, body: matrixError("M_UNKNOWN_TOKEN", "bad") }]);
  assertEquals(await fetchWhoami(bad.ctx, "https://matrix.example.org", "tok"), null);
});
