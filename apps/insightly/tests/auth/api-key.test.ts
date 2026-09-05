import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: collects the pod alongside the credential", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "basic");
  const keys = auth.fields?.map((f) => f.key);
  // The pod identifies the ACCOUNT, so it belongs to the Connection rather
  // than being re-entered on every action.
  assertEquals(keys, ["pod", "apiKey"]);
  assertEquals(auth.fields?.find((f) => f.key === "apiKey")?.type, "secret");
  assertEquals(auth.fields?.find((f) => f.key === "pod")?.type, "string");
});

Deno.test("api-key: sign uses Basic auth with a BLANK password", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.na1.insightly.com/v3.1/Contacts",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "tok" } }, ctx);
  // Insightly's own documented example encodes `key:` — the key as username,
  // nothing after the colon.
  assertEquals(out.headers["authorization"], `Basic ${btoa("tok:")}`);
});

Deno.test("api-key: test refuses a half-filled credential without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: { pod: "na1" } }, ctx), {
    ok: false,
    message: "credential missing pod or apiKey",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test probes /Users/Me, signed itself", async () => {
  const ok = mockCtx([{ body: { USER_ID: 1 } }]);
  assertEquals(
    await auth.test({ credential: { pod: "na1", apiKey: "tok" } }, ok.ctx),
    { ok: true },
  );
  assertEquals(ok.calls[0].url, "https://api.na1.insightly.com/v3.1/Users/Me");
  assertEquals(ok.calls[0].headers["authorization"], `Basic ${btoa("tok:")}`);
});

Deno.test("api-key: test reports Insightly's documented 401 body", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { Message: "Authorization has been denied for this request." },
  }]);
  const result = await auth.test({ credential: { pod: "na1", apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(
    result.message,
    "Insightly rejected the API key (401: Authorization has been denied for this request.). " +
      "Check the key under User Settings, or that it wasn't reset.",
  );
});

Deno.test("api-key: test surfaces a wrong-pod-shaped non-401 failure", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }]);
  const result = await auth.test({ credential: { pod: "wrongpod", apiKey: "tok" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(
    result.message,
    'Insightly returned 404 at pod "wrongpod". Check the pod segment from your API URL.',
  );
});

Deno.test("api-key: afterConnect records the pod and the user's name/email", async () => {
  const { ctx, calls } = mockCtx([{
    body: { FIRST_NAME: "Jo", LAST_NAME: "Doe", EMAIL_ADDRESS: "jo@acme.test" },
  }]);
  const out = await auth.afterConnect!({ credential: { pod: "na1", apiKey: "tok" } }, ctx);
  assertEquals(out, { pod: "na1", name: "Jo Doe", email: "jo@acme.test" });
  // afterConnect gets an unsigned ctx.fetch (see hook-runtime.md) — it must
  // sign itself exactly like `test` does.
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("tok:")}`);
});

Deno.test("api-key: afterConnect still records the pod if the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const out = await auth.afterConnect!({ credential: { pod: "na1", apiKey: "tok" } }, ctx);
  // Without this the client could never build a URL for the connection.
  assertEquals(out, { pod: "na1" });
});

Deno.test("api-key: afterConnect never throws even if the probe rejects outright", async () => {
  const { ctx } = mockCtx([]); // no queued response -> fetchImpl throws
  const out = await auth.afterConnect!({ credential: { pod: "na1", apiKey: "tok" } }, ctx);
  assertEquals(out, { pod: "na1" });
});
