import { assert, assertEquals } from "@std/assert";
import { compact, formatSendblueError, SendblueClient } from "../../lib/client.ts";
import { errorBody, jsonBodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("formatSendblueError: uses the message field when the body is JSON", () => {
  const msg = formatSendblueError(401, "GET", "/api/v2/contacts", JSON.stringify(errorBody("no")));
  assertEquals(msg, "Sendblue 401 for GET /api/v2/contacts: no");
});

Deno.test("formatSendblueError: falls back to the raw body when it is not JSON", () => {
  const msg = formatSendblueError(500, "GET", "/api/v2/contacts", "<html>boom</html>");
  assert(msg.includes("<html>boom</html>"));
});

Deno.test("formatSendblueError: handles the header-missing shape with no `status` field", () => {
  const msg = formatSendblueError(
    403,
    "POST",
    "/api/send-message",
    JSON.stringify({ message: "Did not get inputs for authorization" }),
  );
  assertEquals(
    msg,
    "Sendblue 403 for POST /api/send-message: Did not get inputs for authorization",
  );
});

Deno.test("SendblueClient.get: builds the URL, drops empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: { count: 3 } }]);
  const client = new SendblueClient(ctx);
  const out = await client.get<{ count: number }>("/api/v2/contacts/count", {
    email: "",
    limit: undefined,
  });

  assertEquals(out.count, 3);
  assertEquals(pathOf(calls[0].url), "/api/v2/contacts/count");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].method, "GET");
});

Deno.test("SendblueClient.post: sends a JSON body with content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK" } }]);
  const client = new SendblueClient(ctx);
  await client.post("/api/send-message", { number: "+15550001111" });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(jsonBodyOf(calls[0]), { number: "+15550001111" });
});

Deno.test("SendblueClient: a non-ok response throws using the body's message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Invalid Credentials") }]);
  const client = new SendblueClient(ctx);

  await assertRejectsMessage(
    () => client.get("/api/v2/contacts/count"),
    /Invalid Credentials/,
  );
});

Deno.test("SendblueClient: a 204/empty body resolves to undefined, not a parse error", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const client = new SendblueClient(ctx);
  const out = await client.delete("/api/v2/verify/services/SV1");
  assertEquals(out, undefined);
});

async function assertRejectsMessage(fn: () => Promise<unknown>, pattern: RegExp) {
  try {
    await fn();
  } catch (err) {
    assert(pattern.test((err as Error).message), (err as Error).message);
    return;
  }
  throw new Error("expected rejection, got none");
}
