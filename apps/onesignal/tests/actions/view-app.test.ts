import { assertEquals } from "@std/assert";
import viewApp from "../../actions/view-app.ts";
import { REDACTED_APP_FIELDS } from "../../lib/client.ts";
import { APP_ID, mockCtxWithConnection, pathOf, queryOf } from "../_helpers.ts";

Deno.test("view-app: requests view=config, and strips every live credential field", async () => {
  const rawResponse: Record<string, unknown> = {
    id: APP_ID,
    name: "My App",
    gcm_key: "LEGACY-SECRET",
    fcm_v1_service_account_json: '{"type": "service_account", "private_key": "-----BEGIN..."}',
    apns_p8: "-----BEGIN PRIVATE KEY-----",
    apns_certificates: "base64cert",
    safari_apns_certificate: "base64cert",
    chrome_key: "chrome-secret",
    channels: ["push"],
  };
  const { ctx, calls } = mockCtxWithConnection([{ status: 200, body: rawResponse }]);
  const out = await viewApp.execute({}, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), `/apps/${APP_ID}`);
  assertEquals(queryOf(calls[0].url), { view: "config" });

  assertEquals(out.id, APP_ID);
  assertEquals(out.name, "My App");
  assertEquals(out.channels, ["push"]);
  for (const field of REDACTED_APP_FIELDS) {
    assertEquals(field in out, false, `${field} leaked into the action's output`);
  }
});
