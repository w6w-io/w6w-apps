import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  compact,
  errorMessage,
  FolkClient,
  NETWORK_PLACEHOLDER,
  networkPath,
} from "../../lib/client.ts";

Deno.test("networkPath: prefixes with the network placeholder", () => {
  assertEquals(networkPath("/groups"), `/network/${NETWORK_PLACEHOLDER}/groups`);
});

Deno.test("errorMessage: reads a `message` key", () => {
  assertEquals(errorMessage('{"message":"bad request"}'), "bad request");
});

Deno.test("errorMessage: reads an `error` key", () => {
  assertEquals(errorMessage('{"error":"nope"}'), "nope");
});

Deno.test("errorMessage: falls back to raw text when not JSON", () => {
  assertEquals(errorMessage("plain text failure"), "plain text failure");
});

Deno.test("errorMessage: empty text stays empty", () => {
  assertEquals(errorMessage(""), "");
});

Deno.test("compact: drops undefined keys only", () => {
  assertEquals(compact({ a: 1, b: undefined, c: 0, d: "" }), { a: 1, c: 0, d: "" });
});

Deno.test("FolkClient: GET decodes a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1" } }]);
  const out = await new FolkClient(ctx).request("/user");
  assertEquals(out, { id: "u1" });
  assertEquals(calls[0].url, "https://api.folk.app/user");
  assertEquals(calls[0].method, "GET");
});

Deno.test("FolkClient: POST sends a JSON body with content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "p1" } }]);
  await new FolkClient(ctx).request("/network/n1/group/g1/person", {
    method: "POST",
    body: { fullName: "Ada" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ fullName: "Ada" }));
});

Deno.test("FolkClient: a non-ok response throws with the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Not found." } }]);
  await assertRejects(
    () => new FolkClient(ctx).request("/network/n1/groups"),
    Error,
    "folk 404",
  );
});

Deno.test("FolkClient: an empty body resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  const out = await new FolkClient(ctx).request("/network/n1/group/g1/person/p1");
  assertEquals(out, undefined);
});
