import { assertEquals, assertRejects } from "@std/assert";
import { cfError, mockCtx } from "../_helpers.ts";
import { base64ToBytes, CognitoFormsApiError, CognitoFormsClient } from "../../lib/client.ts";

Deno.test("client: GET builds the URL under /api and returns the bare JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ Id: "1", Name: "My Form" }] }]);
  const result = await new CognitoFormsClient(ctx).request("/forms");
  assertEquals(new URL(calls[0].url).pathname, "/api/forms");
  assertEquals(result, [{ Id: "1", Name: "My Form" }]);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new CognitoFormsClient(ctx).request("/forms/1/schema", {
    query: { input: true, includeLinks: undefined, extra: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("input"), "true");
  assertEquals(url.searchParams.has("includeLinks"), false);
  assertEquals(url.searchParams.has("extra"), false);
});

Deno.test("client: a JSON body is sent as application/json", async () => {
  const { ctx, calls } = mockCtx([{ body: { Id: "e1" } }]);
  await new CognitoFormsClient(ctx).request("/forms/1/entries", {
    method: "POST",
    body: { Entry: { Action: "Submit" } },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { Entry: { Action: "Submit" } });
});

Deno.test("client: a FormData body is passed through without a content-type override", async () => {
  const { ctx, calls } = mockCtx([{ body: { Id: "f1" } }]);
  const form = new FormData();
  form.append("File", new Blob(["hi"]), "hi.txt");
  await new CognitoFormsClient(ctx).request("/files", { method: "POST", form });
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[0].rawBody, form);
});

Deno.test("client: a 204 response resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const result = await new CognitoFormsClient(ctx).request("/forms/1/entries/2", {
    method: "DELETE",
  });
  assertEquals(result, undefined);
});

Deno.test("client: a non-2xx response throws a CognitoFormsApiError carrying Type/Data/SupportCode", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: cfError("EntryNotFound", "Entry not found.") },
  ]);
  const err = await assertRejects(
    () => new CognitoFormsClient(ctx).request("/forms/1/entries/nope"),
    CognitoFormsApiError,
  );
  assertEquals(err.status, 404);
  assertEquals(err.type, "EntryNotFound");
  assertEquals(err.supportCode, "ABC-123-DEF");
  assertEquals(err.message.includes("Entry not found."), true);
  assertEquals(err.message.includes("EntryNotFound"), true);
});

Deno.test("client: MissingScope carries its Data.MissingScope through to the error", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: cfError("MissingScope", "Scope authorization failed.", { MissingScope: "Entry:Read" }),
    },
  ]);
  const err = await assertRejects(
    () => new CognitoFormsClient(ctx).request("/forms/1/entries/2"),
    CognitoFormsApiError,
  );
  assertEquals(err.data, { MissingScope: "Entry:Read" });
});

Deno.test("client: a non-JSON error body still produces a descriptive error", async () => {
  const { ctx } = mockCtx([
    { status: 502, statusText: "Bad Gateway", body: "<html>gateway</html>", headers: {} },
  ]);
  await assertRejects(
    () => new CognitoFormsClient(ctx).request("/forms"),
    CognitoFormsApiError,
    "Cognito Forms 502",
  );
});

Deno.test("client: never sets an Authorization header itself", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new CognitoFormsClient(ctx).request("/forms");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("base64ToBytes: decodes a bare base64 string", () => {
  const bytes = new Uint8Array(base64ToBytes(btoa("hello")));
  assertEquals(new TextDecoder().decode(bytes), "hello");
});

Deno.test("base64ToBytes: strips a data: URL prefix before decoding", () => {
  const bytes = new Uint8Array(base64ToBytes(`data:text/plain;base64,${btoa("hi")}`));
  assertEquals(new TextDecoder().decode(bytes), "hi");
});
