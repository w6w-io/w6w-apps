import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  API_URL,
  buildRpcBody,
  compact,
  findParams,
  NutshellClient,
  parseJsonObject,
  toId,
  unwrapRpc,
} from "../../lib/client.ts";
import { mockCtx, rpcBody } from "../_helpers.ts";

Deno.test("buildRpcBody: builds a JSON-RPC 2.0 envelope with named params", () => {
  const body = JSON.parse(buildRpcBody("getLead", { leadId: 42 }));
  assertEquals(body.jsonrpc, "2.0");
  assertEquals(body.method, "getLead");
  assertEquals(body.params, { leadId: 42 });
  assert("id" in body);
});

Deno.test("unwrapRpc: returns result on a success envelope with no error key", () => {
  const text = JSON.stringify({ jsonrpc: "2.0", id: "1", result: { id: 1000 } });
  assertEquals(unwrapRpc<{ id: number }>(200, text), { id: 1000 });
});

Deno.test("unwrapRpc: throws Nutshell's own message on a 401 error envelope (verified shape)", () => {
  // Verified live 2026-09-06: a bad API key returns HTTP 401 AND this body.
  const text = JSON.stringify({
    jsonrpc: "2.0",
    id: "1",
    error: { code: 401, message: "API key not found", data: null },
  });
  const err = assertThrows(() => unwrapRpc(401, text), Error);
  assert(/API key not found/.test(err.message));
});

Deno.test("unwrapRpc: throws on a 409 rev-conflict error envelope (verified shape)", () => {
  const text = JSON.stringify({
    jsonrpc: "2.0",
    id: "1",
    error: { code: 409, message: "rev key is out-of-date", data: null },
  });
  const err = assertThrows(() => unwrapRpc(409, text), Error);
  assert(/rev key is out-of-date/.test(err.message));
});

Deno.test("unwrapRpc: reads the error object even when status alone would look fine", () => {
  // Guards against ever trusting `res.ok` — an error object at 200 must still throw.
  const text = JSON.stringify({
    jsonrpc: "2.0",
    id: "1",
    error: { code: -32601, message: "Method not found" },
  });
  assertThrows(() => unwrapRpc(200, text), Error, "Method not found");
});

Deno.test("unwrapRpc: throws a legible error on a non-JSON body", () => {
  assertThrows(() => unwrapRpc(502, "<html>Bad Gateway</html>"), Error, "non-JSON response");
});

Deno.test("NutshellClient.call: POSTs to the JSON-RPC endpoint with no credential on the wire", async () => {
  const { ctx, calls } = mockCtx([{ result: { id: 1000, name: "Lead-1000" } }]);
  const result = await new NutshellClient(ctx).call("getLead", { leadId: 1000 });
  assertEquals(result, { id: 1000, name: "Lead-1000" });
  assertEquals(calls[0].url, API_URL);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(rpcBody(calls[0]).method, "getLead");
  assertEquals(rpcBody(calls[0]).params, { leadId: 1000 });
});

Deno.test("compact: drops undefined, null and empty-string values", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: 0, f: false }), {
    a: 1,
    e: 0,
    f: false,
  });
});

Deno.test("toId: numeric strings become numbers; other strings pass through", () => {
  assertEquals(toId("1000"), 1000);
  assertEquals(toId(1000), 1000);
  assertEquals(toId("abc-lead"), "abc-lead");
});

Deno.test("toId: throws on an empty id", () => {
  assertThrows(() => toId(""), Error, "id is required");
});

Deno.test("parseJsonObject: parses a JSON string and passes through an object", () => {
  assertEquals(parseJsonObject('{"a":1}', "Additional fields"), { a: 1 });
  assertEquals(parseJsonObject({ a: 1 }, "Additional fields"), { a: 1 });
  assertEquals(parseJsonObject(undefined, "Additional fields"), {});
  assertEquals(parseJsonObject("", "Additional fields"), {});
});

Deno.test("parseJsonObject: rejects a JSON array and invalid JSON", () => {
  assertThrows(() => parseJsonObject("[1,2]", "Additional fields"), Error, "must be a JSON object");
  assertThrows(() => parseJsonObject("{not json", "Additional fields"), Error, "not valid JSON");
});

Deno.test("findParams: maps fullRecords to the inverse stubResponses key", () => {
  assertEquals(findParams({ limit: 10, page: 2, fullRecords: true }), {
    limit: 10,
    page: 2,
    stubResponses: false,
  });
  // Default (fullRecords omitted/false) sends nothing — Nutshell's own default (stubs) applies.
  assertEquals(findParams({}), {});
});
