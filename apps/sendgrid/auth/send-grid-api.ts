import type { AuthDefinition } from "@w6w/types";

const auth: AuthDefinition = {
  key: "send-grid-api",
  type: "bearer",
  displayName: "SendGrid API",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      default: "",
    },
  ],

  sign({ request, credential }) {
    request.headers["authorization"] = `Bearer ${(credential as { apiKey: string }).apiKey}`;
    return request;
  },

  async test({ credential: _credential }, ctx) {
    const res = await ctx.fetch("https://api.sendgrid.com/v3/scopes");
    if (!res.ok) return { ok: false, message: `Auth check returned ${res.status}` };
    return { ok: true };
  },
};

export default auth;
