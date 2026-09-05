import { assertEquals } from "@std/assert";
import sessionCreate from "../../actions/session-create.ts";
import { API_ROOT, mockCtx, pathOf } from "../_helpers.ts";

function session(overrides: Record<string, unknown> = {}) {
  return {
    session_id: "devin-abc123",
    status: "running",
    url: "https://app.devin.ai/sessions/devin-abc123",
    org_id: "org-test0000000000",
    created_at: 1000,
    updated_at: 1000,
    acus_consumed: 0,
    pull_requests: [],
    tags: [],
    ...overrides,
  };
}

Deno.test("session-create: posts to /sessions with only the fields the caller set", async () => {
  const { ctx, calls } = mockCtx([{ body: session() }]);
  await sessionCreate.execute({ prompt: "Fix the failing test" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/sessions`);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { prompt: "Fix the failing test" });
});

Deno.test("session-create: maps camelCase params onto Devin's snake_case body fields", async () => {
  const { ctx, calls } = mockCtx([{ body: session() }]);
  await sessionCreate.execute({
    prompt: "Ship it",
    title: "My session",
    tags: ["urgent", "backend"],
    repos: "acme/widgets",
    playbookId: "playbook-1",
    devinMode: "fast",
    maxAcuLimit: 10,
    resumable: false,
    attachmentUrls: ["https://api.devin.ai/attachment/1"],
    secretIds: ["secret-1"],
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    prompt: "Ship it",
    title: "My session",
    tags: ["urgent", "backend"],
    repos: ["acme/widgets"],
    playbook_id: "playbook-1",
    devin_mode: "fast",
    max_acu_limit: 10,
    resumable: false,
    attachment_urls: ["https://api.devin.ai/attachment/1"],
    secret_ids: ["secret-1"],
  });
});

Deno.test("session-create: returns the session verbatim", async () => {
  const { ctx } = mockCtx([{ body: session({ status: "new" }) }]);
  const out = await sessionCreate.execute({ prompt: "hi" }, ctx);
  assertEquals(out.status, "new");
  assertEquals(out.session_id, "devin-abc123");
});

Deno.test("session-create: is not idempotent — every retry starts a new billed session", () => {
  assertEquals(sessionCreate.idempotent, false);
});

Deno.test("session-create: requires a prompt", () => {
  const prompt = sessionCreate.params?.find((p) => p.key === "prompt");
  assertEquals(prompt?.required, true);
});

Deno.test("session-create: path carries the connection's organization id", async () => {
  const { ctx, calls } = mockCtx([{ body: session() }]);
  await sessionCreate.execute({ prompt: "hi" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/organizations/org-test0000000000/sessions");
});
