import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  API_PREFIX,
  baseUrl,
  datacenterFromConnection,
  encodeId,
  formatQualtricsError,
  HOST_SUFFIX,
  QualtricsClient,
  truncate,
  unwrap,
} from "../../lib/client.ts";
import { connectionFor, envelope, listEnvelope, mockCtx } from "../_helpers.ts";

Deno.test("client: the host is the connection's datacenter, and the prefix is /API/v3", () => {
  assertEquals(HOST_SUFFIX, ".qualtrics.com");
  assertEquals(API_PREFIX, "/API/v3");
  assertEquals(baseUrl("fra1"), "https://fra1.qualtrics.com/API/v3");
});

Deno.test("client: the datacenter id comes from the redacted display, never the credential", () => {
  assertEquals(datacenterFromConnection(connectionFor("syd1")), "syd1");
});

Deno.test("client: a connection with no recorded datacenter is a fixable error", () => {
  const connection = connectionFor("iad1");
  connection.display = {};
  assertThrows(
    () => datacenterFromConnection(connection),
    Error,
    "records no datacenter id",
  );
  assertThrows(() => datacenterFromConnection(undefined), Error, "records no datacenter id");
});

Deno.test("client: the built URL uses the connection's datacenter", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: listEnvelope([]) }],
    connectionFor("yul1"),
  );
  await new QualtricsClient(ctx).list("/surveys");

  assertEquals(calls[0].url, "https://yul1.qualtrics.com/API/v3/surveys");
});

Deno.test("client: a non-elements array result is returned as-is", async () => {
  const { ctx } = mockCtx([{ body: envelope([{ id: "a" }]) }]);
  const out = await new QualtricsClient(ctx).list("/surveys");

  assertEquals(out.elements, [{ id: "a" }]);
});

Deno.test("client: request unwraps result, and identity when there is no envelope", () => {
  assertEquals(unwrap({ meta: {}, result: { id: "SV_1" } }), { id: "SV_1" });
  assertEquals(unwrap([{ id: "x" }]), [{ id: "x" }]);
});

Deno.test("client: query values that are absent are dropped, not sent blank", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await new QualtricsClient(ctx).list("/distributions", {
    query: { surveyId: "SV_1", offset: undefined, limit: null },
  });

  assertEquals(calls[0].url, "https://iad1.qualtrics.com/API/v3/distributions?surveyId=SV_1");
});

Deno.test("client: encodeId neutralises a slash and a query, keeps a plain id", () => {
  assertEquals(encodeId("SV_1"), "SV_1");
  assertEquals(encodeId("a/b?c"), "a%2Fb%3Fc");
  assertEquals(encodeId("  SV_1 "), "SV_1");
});

Deno.test("client: an error surfaces the vendor's errorCode and message, not the status alone", () => {
  const line = formatQualtricsError(
    401,
    "GET",
    "/API/v3/whoami",
    JSON.stringify({
      meta: { error: { errorCode: "DCD_7", errorMessage: "Unrecognized X-API-TOKEN." } },
    }),
  );
  assert(/Qualtrics 401 DCD_7/.test(line), line);
  assert(/Unrecognized X-API-TOKEN/.test(line), line);
});

Deno.test("client: a non-JSON error body still yields a readable line", () => {
  const line = formatQualtricsError(500, "GET", "/API/v3/surveys", "<html>boom</html>");
  assert(/Qualtrics 500/.test(line), line);
  assert(/boom/.test(line), line);
});

Deno.test("client: a long error body is truncated", () => {
  const long = "x".repeat(1200);
  const line = truncate(long, 600);
  assertEquals(line.length < long.length, true);
  assert(line.includes("truncated"), line);
});

Deno.test("client: a non-JSON success body is a named error, not a silent undefined", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  let message = "";
  try {
    await new QualtricsClient(ctx).request("/surveys");
  } catch (err) {
    message = (err as Error).message;
  }
  assert(/non-JSON body/.test(message), message);
});
