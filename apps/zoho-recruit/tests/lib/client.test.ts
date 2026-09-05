import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  formatRecruitError,
  moduleName,
  unwrapRecordResult,
  unwrapStatusResult,
  ZohoRecruitClient,
} from "../../lib/client.ts";
import { mockCtx, mockRecruitCtx } from "../_helpers.ts";

Deno.test("moduleName: accepts letters, digits and underscores", () => {
  assertEquals(moduleName("Job_Openings"), "Job_Openings");
  assertEquals(moduleName("Candidates"), "Candidates");
});

Deno.test("moduleName: rejects anything else", () => {
  for (const bad of ["../secrets", "Job Openings", "Job-Openings", ""]) {
    let threw = false;
    try {
      moduleName(bad);
    } catch {
      threw = true;
    }
    assert(threw, `expected moduleName(${JSON.stringify(bad)}) to throw`);
  }
});

Deno.test("formatRecruitError: surfaces the vendor's own code and message", () => {
  const msg = formatRecruitError(
    401,
    "GET",
    "/recruit/v2/Candidates",
    JSON.stringify({ code: "INVALID_TOKEN", message: "invalid oauth token", status: "error" }),
  );
  assert(msg.includes("INVALID_TOKEN"));
  assert(msg.includes("invalid oauth token"));
  assert(msg.includes("401"));
});

Deno.test("formatRecruitError: falls back to the raw body when it is not the documented shape", () => {
  const msg = formatRecruitError(500, "GET", "/recruit/v2/Candidates", "upstream exploded");
  assert(msg.includes("upstream exploded"));
  assert(msg.includes("500"));
});

Deno.test("unwrapRecordResult: returns the single entry on success", () => {
  const entry = unwrapRecordResult({
    data: [{ code: "SUCCESS", status: "success", details: { id: "1" }, message: "record added" }],
  });
  assertEquals(entry.code, "SUCCESS");
});

Deno.test("unwrapRecordResult: throws on a per-item error even though the call itself succeeded", () => {
  assertThrows(
    () =>
      unwrapRecordResult({
        data: [{ code: "DUPLICATE_DATA", status: "error", message: "duplicate record" }],
      }),
    Error,
    "DUPLICATE_DATA",
  );
});

Deno.test("unwrapRecordResult: throws when the response carries no data at all", () => {
  let threw = false;
  try {
    unwrapRecordResult({});
  } catch {
    threw = true;
  }
  assert(threw);
});

Deno.test("unwrapStatusResult: flattens the nested data[0] array on success", () => {
  const results = unwrapStatusResult({
    data: [[
      { code: "SUCCESS", status: "success", details: { id: "1" }, message: "status changed" },
    ]],
  });
  assertEquals(results.length, 1);
  assertEquals(results[0].code, "SUCCESS");
});

Deno.test("unwrapStatusResult: throws if any per-id entry failed", () => {
  let threw = false;
  try {
    unwrapStatusResult({
      data: [[
        { code: "SUCCESS", status: "success" },
        { code: "INVALID_DATA", status: "error", message: "bad id" },
      ]],
    });
  } catch (err) {
    threw = true;
    assert(String(err).includes("INVALID_DATA"));
  }
  assert(threw);
});

Deno.test("ZohoRecruitClient: addresses the connection's recorded region host", async () => {
  const { ctx, calls } = mockRecruitCtx([{ body: { data: [] } }], "recruit.zoho.eu");
  await new ZohoRecruitClient(ctx).request("/Candidates");
  assertEquals(new URL(calls[0].url).host, "recruit.zoho.eu");
  assertEquals(new URL(calls[0].url).pathname, "/recruit/v2/Candidates");
});

Deno.test("ZohoRecruitClient: falls back to the US host when the connection carries none", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new ZohoRecruitClient(ctx).request("/Candidates");
  assertEquals(new URL(calls[0].url).host, "recruit.zoho.com");
});
