import { assertEquals, assertRejects } from "@std/assert";
import {
  compact,
  errorMessage,
  nextCursor,
  parseError,
  ProcessStreetClient,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("errorMessage: formats the documented ErrorInfo shape with errorCode", () => {
  assertEquals(
    errorMessage(JSON.stringify({ error: "Not found", errorCode: "NotFound" })),
    "Not found (NotFound)",
  );
});

Deno.test("errorMessage: falls back to just the error text when errorCode is absent", () => {
  assertEquals(
    errorMessage(JSON.stringify({ error: "Unable to verify credentials." })),
    "Unable to verify credentials.",
  );
});

Deno.test("errorMessage: falls back to the raw text when it isn't JSON", () => {
  assertEquals(errorMessage("plain text failure"), "plain text failure");
});

Deno.test("errorMessage: empty text stays empty", () => {
  assertEquals(errorMessage(""), "");
});

Deno.test("parseError: exposes errorCode/requestId when present", () => {
  const parsed = parseError(JSON.stringify({ error: "x", errorCode: "Conflict", requestId: "r1" }));
  assertEquals(parsed?.errorCode, "Conflict");
  assertEquals(parsed?.requestId, "r1");
});

Deno.test("parseError: undefined for non-JSON or empty text", () => {
  assertEquals(parseError(""), undefined);
  assertEquals(parseError("not json"), undefined);
});

Deno.test("nextCursor: extracts the `_` query value from the 'next' link", () => {
  const links = [
    {
      name: "self",
      href: "https://public-api.process.st/api/v1.1/workflows",
      type: "Api" as const,
    },
    {
      name: "next",
      href: "https://public-api.process.st/api/v1.1/workflows?_=abc123",
      type: "Api" as const,
    },
  ];
  assertEquals(nextCursor(links), "abc123");
});

Deno.test("nextCursor: undefined when there is no 'next' link", () => {
  assertEquals(nextCursor([{ name: "self", href: "https://x/y", type: "Api" }]), undefined);
  assertEquals(nextCursor(undefined), undefined);
});

Deno.test("compact: drops undefined keys, keeps false/0/empty-string", () => {
  assertEquals(compact({ a: 1, b: undefined, c: false, d: "", e: 0 }), {
    a: 1,
    c: false,
    d: "",
    e: 0,
  });
});

Deno.test("ProcessStreetClient: builds the base URL and forwards query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { workflows: [] } }]);
  await new ProcessStreetClient(ctx).request("/workflows", { query: { name: "Onboarding" } });
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://public-api.process.st/api/v1.1/workflows");
  assertEquals(url.searchParams.get("name"), "Onboarding");
});

Deno.test("ProcessStreetClient: never sets X-API-Key itself", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new ProcessStreetClient(ctx).request("/testAuth");
  assertEquals(calls[0].headers["x-api-key"], undefined);
});

Deno.test("ProcessStreetClient: throws with vendor detail on a non-ok response", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "Not found", errorCode: "NotFound" } }]);
  await assertRejects(
    () => new ProcessStreetClient(ctx).request("/workflows/missing"),
    Error,
    "Not found (NotFound)",
  );
});
