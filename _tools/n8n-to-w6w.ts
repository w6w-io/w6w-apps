/**
 * n8n node → w6w app converter (best-effort).
 *
 * Reads an n8n node directory from GitHub, parses each `.ts` file's AST with
 * the TypeScript compiler API, extracts the node `description` and any exported
 * `INodeProperties[]` arrays, partitions the property tree by (resource,
 * operation), and emits a w6w `apps/<name>/` tree with one ActionDefinition per
 * pair. The `execute` body is left as a TODO that wires `ctx.fetch` — n8n's
 * request DSL (`this.helpers.httpRequest`, parameter routing) doesn't translate
 * mechanically. Credential files (when discoverable) become an AuthDefinition.
 *
 *   deno run --allow-net --allow-read --allow-write \
 *     apps/_tools/n8n-to-w6w.ts \
 *     --from github:n8n-io/n8n/packages/nodes-base/nodes/SendGrid \
 *     --to apps/sendgrid \
 *     --id io.w6w.sendgrid
 */
import ts from "npm:typescript@5.7.3";

// ---------- arg parsing ----------

interface Args {
  from: string;
  to: string;
  ref: string;
  id?: string;
  credentialsPath: string;
}

function parseArgs(argv: string[]): Args {
  const map: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith("--")) continue;
    map[k.slice(2)] = argv[i + 1];
    i++;
  }
  if (!map.from || !map.to) {
    console.error(
      "usage: n8n-to-w6w.ts --from github:owner/repo/path --to <dir> [--ref master] [--id com.example.app] [--credentialsPath packages/nodes-base/credentials]",
    );
    Deno.exit(1);
  }
  return {
    from: map.from,
    to: map.to,
    ref: map.ref ?? "master",
    id: map.id,
    credentialsPath: map.credentialsPath ?? "packages/nodes-base/credentials",
  };
}

// ---------- github ----------

interface GitHubRef {
  owner: string;
  repo: string;
  path: string;
  ref: string;
}

function parseGitHubRef(from: string, ref: string): GitHubRef {
  const m = from.match(/^github:([^/]+)\/([^/]+)\/(.+)$/);
  if (!m) throw new Error(`Unrecognized --from ref: ${from}`);
  return { owner: m[1], repo: m[2], path: m[3], ref };
}

interface GhFile {
  name: string;
  path: string;
  type: "file" | "dir";
  download_url: string | null;
}

async function ghList(ref: GitHubRef): Promise<GhFile[]> {
  const url =
    `https://api.github.com/repos/${ref.owner}/${ref.repo}/contents/${ref.path}?ref=${ref.ref}`;
  const r = await fetch(url, { headers: { accept: "application/vnd.github+json" } });
  if (!r.ok) throw new Error(`GitHub list failed (${r.status}): ${url}`);
  return r.json();
}

async function ghText(url: string): Promise<string> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`GitHub fetch failed (${r.status}): ${url}`);
  return r.text();
}

// ---------- AST -> JS-value ----------

type Unresolved = { __unresolved: string };
type Spread = { __spread: string };
type JsValue = string | number | boolean | null | undefined | Unresolved | Spread | JsValue[] | { [k: string]: JsValue };

function evalNode(node: ts.Node): JsValue {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) {
    const inner = evalNode(node.operand);
    return typeof inner === "number" ? -inner : { __unresolved: node.getText() };
  }
  if (ts.isArrayLiteralExpression(node)) {
    const out: JsValue[] = [];
    for (const el of node.elements) {
      if (ts.isSpreadElement(el)) {
        out.push({ __spread: el.expression.getText() });
        continue;
      }
      out.push(evalNode(el));
    }
    return out;
  }
  if (ts.isObjectLiteralExpression(node)) {
    const out: Record<string, JsValue> = {};
    for (const p of node.properties) {
      if (ts.isPropertyAssignment(p)) {
        const key = p.name && ts.isIdentifier(p.name)
          ? p.name.text
          : p.name && ts.isStringLiteral(p.name)
          ? p.name.text
          : p.name?.getText() ?? "?";
        out[key] = evalNode(p.initializer);
      } else if (ts.isShorthandPropertyAssignment(p)) {
        out[p.name.text] = { __unresolved: p.name.text };
      }
    }
    return out;
  }
  if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
    return evalNode(node.expression);
  }
  return { __unresolved: node.getText() };
}

function isUnresolved(v: JsValue): v is Unresolved {
  return !!v && typeof v === "object" && !Array.isArray(v) && "__unresolved" in v;
}
function isSpread(v: JsValue): v is Spread {
  return !!v && typeof v === "object" && !Array.isArray(v) && "__spread" in v;
}
function asObj(v: JsValue): Record<string, JsValue> | null {
  return v && typeof v === "object" && !Array.isArray(v) && !isUnresolved(v) && !isSpread(v)
    ? v as Record<string, JsValue>
    : null;
}
function asArr(v: JsValue): JsValue[] | null {
  return Array.isArray(v) ? v : null;
}

// ---------- node-file parsing ----------

interface ParsedFile {
  filename: string;
  exportedArrays: Record<string, JsValue[]>;
  classDescription: Record<string, JsValue> | null;
  credentialClass: Record<string, JsValue> | null;
  credentialName: string | null;
}

function parseSourceFile(filename: string, content: string): ParsedFile {
  const src = ts.createSourceFile(filename, content, ts.ScriptTarget.Latest, true);
  const exportedArrays: Record<string, JsValue[]> = {};
  let classDescription: Record<string, JsValue> | null = null;
  let credentialClass: Record<string, JsValue> | null = null;
  let credentialName: string | null = null;

  for (const stmt of src.statements) {
    if (ts.isVariableStatement(stmt)) {
      const isExport = stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      if (!isExport) continue;
      for (const decl of stmt.declarationList.declarations) {
        if (!decl.initializer) continue;
        if (!ts.isIdentifier(decl.name)) continue;
        // Strip `as const` / type assertions to reach the array literal.
        let init: ts.Expression = decl.initializer;
        while (ts.isAsExpression(init) || ts.isTypeAssertionExpression(init)) init = init.expression;
        if (ts.isArrayLiteralExpression(init)) {
          const val = evalNode(init);
          if (Array.isArray(val)) exportedArrays[decl.name.text] = val;
        }
      }
    }

    if (ts.isClassDeclaration(stmt)) {
      const impls = stmt.heritageClauses?.flatMap((h) =>
        h.token === ts.SyntaxKind.ImplementsKeyword ? h.types.map((t) => t.expression.getText()) : []
      ) ?? [];
      const isNode = impls.includes("INodeType");
      const isCred = impls.includes("ICredentialType");
      if (!isNode && !isCred) continue;

      const props: Record<string, JsValue> = {};
      for (const m of stmt.members) {
        if (!ts.isPropertyDeclaration(m)) continue;
        if (!m.name || !ts.isIdentifier(m.name)) continue;
        if (!m.initializer) continue;
        props[m.name.text] = evalNode(m.initializer);
      }
      if (isNode && props.description) {
        const obj = asObj(props.description);
        if (obj) classDescription = obj;
      }
      if (isCred) {
        credentialClass = props;
        credentialName = typeof props.name === "string" ? props.name : null;
      }
    }
  }

  return { filename, exportedArrays, classDescription, credentialClass, credentialName };
}

// ---------- spread + tree resolution ----------

function resolveSpreads(arr: JsValue[], registry: Record<string, JsValue[]>): JsValue[] {
  const out: JsValue[] = [];
  for (const item of arr) {
    if (isSpread(item)) {
      const resolved = registry[item.__spread];
      if (Array.isArray(resolved)) {
        // Recursively in case a spread file itself spreads other arrays.
        for (const inner of resolveSpreads(resolved, registry)) out.push(inner);
      } else {
        // Leave a marker so we can emit a comment about it.
        out.push({ __unresolved: `spread ${item.__spread}` });
      }
    } else {
      out.push(item);
    }
  }
  return out;
}

// ---------- (resource, operation) partition ----------

interface OperationEntry {
  resource: string;
  operation: string;
  display: { name: string; description?: string; action?: string };
  fields: Record<string, JsValue>[];
}

function partition(properties: JsValue[]): {
  resources: { value: string; name: string }[];
  operations: OperationEntry[];
} {
  // 1. find the resource selector.
  let resources: { value: string; name: string }[] = [];
  for (const p of properties) {
    const obj = asObj(p);
    if (!obj) continue;
    if (obj.name === "resource" && obj.type === "options" && Array.isArray(obj.options)) {
      resources = (obj.options as JsValue[]).flatMap((o) => {
        const e = asObj(o);
        if (!e) return [];
        return [{
          value: String(e.value ?? ""),
          name: String(e.name ?? e.value ?? ""),
        }];
      });
      break;
    }
  }

  // 2. for each resource, find its operation selector.
  const operations: OperationEntry[] = [];
  for (const r of resources) {
    for (const p of properties) {
      const obj = asObj(p);
      if (!obj) continue;
      if (obj.name !== "operation" || obj.type !== "options") continue;
      const display = asObj(obj.displayOptions);
      const show = display ? asObj(display.show) : null;
      const resScope = show ? asArr(show.resource) : null;
      if (!resScope || !resScope.includes(r.value)) continue;

      const opts = asArr(obj.options) ?? [];
      for (const o of opts) {
        const e = asObj(o);
        if (!e) continue;
        operations.push({
          resource: r.value,
          operation: String(e.value ?? ""),
          display: {
            name: String(e.name ?? e.value ?? ""),
            description: typeof e.description === "string" ? e.description : undefined,
            action: typeof e.action === "string" ? e.action : undefined,
          },
          fields: [],
        });
      }
    }
  }

  // 3. attach fields to operations.
  for (const p of properties) {
    const obj = asObj(p);
    if (!obj) continue;
    if (obj.name === "resource" || obj.name === "operation") continue;
    const display = asObj(obj.displayOptions);
    const show = display ? asObj(display.show) : null;
    if (!show) {
      // Field with no display gate — applies to every operation.
      for (const op of operations) op.fields.push(obj);
      continue;
    }
    const resScope = asArr(show.resource);
    const opScope = asArr(show.operation);
    for (const op of operations) {
      const resOk = !resScope || resScope.includes(op.resource);
      const opOk = !opScope || opScope.includes(op.operation);
      if (resOk && opOk) op.fields.push(obj);
    }
  }

  return { resources, operations };
}

// ---------- n8n field -> w6w Param ----------

interface W6wParam {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  default?: unknown;
  hint?: string;
  options?: { value: string | number; label: string; description?: string }[];
  children?: W6wParam[];
}

const TYPE_MAP: Record<string, string> = {
  string: "string",
  number: "number",
  boolean: "boolean",
  options: "select",
  multiOptions: "multiselect",
  dateTime: "datetime",
  json: "json",
  collection: "group",
  fixedCollection: "group",
  hidden: "string",
  color: "string",
  notice: "string",
};

function toParam(field: Record<string, JsValue>): W6wParam | null {
  const name = typeof field.name === "string" ? field.name : null;
  const label = typeof field.displayName === "string" ? field.displayName : name;
  const n8nType = typeof field.type === "string" ? field.type : "string";
  if (!name || !label) return null;
  const param: W6wParam = {
    key: name,
    label,
    type: TYPE_MAP[n8nType] ?? "string",
  };
  if (field.required === true) param.required = true;
  if (typeof field.description === "string") param.hint = field.description;
  if (field.default !== undefined && !isUnresolved(field.default) && !isSpread(field.default)) {
    param.default = field.default as unknown;
  }
  if ((param.type === "select" || param.type === "multiselect") && Array.isArray(field.options)) {
    param.options = [];
    for (const o of field.options as JsValue[]) {
      const e = asObj(o);
      if (!e) continue;
      param.options.push({
        value: (typeof e.value === "string" || typeof e.value === "number")
          ? e.value
          : String(e.value ?? ""),
        label: String(e.name ?? e.value ?? ""),
        description: typeof e.description === "string" ? e.description : undefined,
      });
    }
  }
  // Collections expose nested fields via `options[].values[]` (fixedCollection)
  // or `options[]` (collection). Best-effort flatten.
  if (param.type === "group" && Array.isArray(field.options)) {
    param.children = [];
    for (const o of field.options as JsValue[]) {
      const e = asObj(o);
      if (!e) continue;
      const nested = asArr(e.values) ?? [e];
      for (const n of nested) {
        const nObj = asObj(n);
        if (!nObj) continue;
        const child = toParam(nObj);
        if (child) param.children.push(child);
      }
    }
    if (param.children.length === 0) delete param.children;
  }
  return param;
}

// ---------- code-gen ----------

function kebab(s: string): string {
  return s
    .replace(/[_\s]+/g, "-")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function paramLiteral(p: W6wParam, depth = 0): string {
  const pad = "  ".repeat(depth);
  const lines: string[] = [];
  lines.push(`${pad}{`);
  lines.push(`${pad}  key: ${JSON.stringify(p.key)},`);
  lines.push(`${pad}  label: ${JSON.stringify(p.label)},`);
  lines.push(`${pad}  type: ${JSON.stringify(p.type)},`);
  if (p.required) lines.push(`${pad}  required: true,`);
  if (p.default !== undefined) {
    lines.push(`${pad}  default: ${JSON.stringify(p.default)},`);
  }
  if (p.hint) lines.push(`${pad}  hint: ${JSON.stringify(p.hint)},`);
  if (p.options) {
    lines.push(`${pad}  options: [`);
    for (const o of p.options) lines.push(`${pad}    ${JSON.stringify(o)},`);
    lines.push(`${pad}  ],`);
  }
  if (p.children) {
    lines.push(`${pad}  children: [`);
    for (const c of p.children) lines.push(paramLiteral(c, depth + 2) + ",");
    lines.push(`${pad}  ],`);
  }
  lines.push(`${pad}}`);
  return lines.join("\n");
}

function emitAction(opts: {
  fileKey: string;
  key: string;
  title: string;
  description?: string;
  resource: string;
  operation: string;
  params: W6wParam[];
  sourceUrl: string;
}): string {
  const paramsCode = opts.params.length > 0
    ? `  params: [\n${opts.params.map((p) => paramLiteral(p, 2) + ",").join("\n")}\n  ],\n`
    : "";
  return `import type { ActionDefinition } from "@w6w/types";

/**
 * Generated from n8n: ${opts.resource}:${opts.operation}
 * Source: ${opts.sourceUrl}
 *
 * The execute body is a TODO — n8n routes through its own helpers; port the
 * relevant ${opts.sourceUrl} logic to a ctx.fetch call before shipping.
 */
const action: ActionDefinition = {
  key: ${JSON.stringify(opts.key)},
  type: "perform",
  resource: ${JSON.stringify(opts.resource)},
  title: ${JSON.stringify(opts.title)},
${opts.description ? `  description: ${JSON.stringify(opts.description)},\n` : ""}${paramsCode}
  async execute(_input, ctx) {
    ctx.log("warn", "n8n→w6w action not yet implemented", { action: ${JSON.stringify(opts.key)} });
    throw new Error("Not implemented — port n8n execute logic.");
  },
};

export default action;
`;
}

function emitAuth(opts: {
  key: string;
  displayName: string;
  fields: W6wParam[];
  apiKeyField: string | null;
  bearer: boolean;
  testUrl: string | null;
}): string {
  const fieldsCode = opts.fields.length > 0
    ? `  fields: [\n${opts.fields.map((p) => paramLiteral(p, 2) + ",").join("\n")}\n  ],\n`
    : "";
  const apiKey = opts.apiKeyField ?? "apiKey";
  const signBody = opts.bearer
    ? `    request.headers["authorization"] = \`Bearer \${(credential as { ${apiKey}: string }).${apiKey}}\`;
    return request;`
    : `    request.headers["authorization"] = \`\${(credential as { ${apiKey}: string }).${apiKey}}\`;
    return request;`;
  const testBody = opts.testUrl
    ? `    const res = await ctx.fetch(${JSON.stringify(opts.testUrl)});
    if (!res.ok) return { ok: false, message: \`Auth check returned \${res.status}\` };
    return { ok: true };`
    : `    return { ok: true };`;
  return `import type { AuthDefinition } from "@w6w/types";

const auth: AuthDefinition = {
  key: ${JSON.stringify(opts.key)},
  type: ${JSON.stringify(opts.bearer ? "bearer" : "apiKey")},
  displayName: ${JSON.stringify(opts.displayName)},
${fieldsCode}
  sign({ request, credential }) {
${signBody}
  },

  async test({ credential: _credential }, ctx) {
${testBody}
  },
};

export default auth;
`;
}

// ---------- credential -> auth ----------

interface CredInfo {
  key: string;
  displayName: string;
  fields: W6wParam[];
  apiKeyField: string | null;
  bearer: boolean;
  testUrl: string | null;
}

async function loadCredential(
  credentialName: string,
  args: Args,
  ref: GitHubRef,
): Promise<CredInfo | null> {
  // Conventional file name: <CredentialNameCapitalized>.credentials.ts
  const capital = credentialName.charAt(0).toUpperCase() + credentialName.slice(1);
  const candidates = [
    `${capital}.credentials.ts`,
    `${credentialName}.credentials.ts`,
  ];
  for (const filename of candidates) {
    const url =
      `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${ref.ref}/${args.credentialsPath}/${filename}`;
    try {
      const text = await ghText(url);
      const parsed = parseSourceFile(filename, text);
      if (!parsed.credentialClass) continue;
      const cls = parsed.credentialClass;
      const fields: W6wParam[] = [];
      const propsArr = asArr(cls.properties) ?? [];
      let apiKeyField: string | null = null;
      for (const f of propsArr) {
        const obj = asObj(f);
        if (!obj) continue;
        const param = toParam(obj);
        if (!param) continue;
        // Heuristic: any field n8n marks `password` becomes a w6w secret field.
        const typeOpts = asObj(obj.typeOptions);
        if (typeOpts && typeOpts.password === true) param.type = "secret";
        fields.push(param);
        if (param.type === "secret" && !apiKeyField) apiKeyField = param.key;
      }
      // Detect bearer vs api-key heuristically from `authenticate`.
      let bearer = false;
      let testUrl: string | null = null;
      const auth = asObj(cls.authenticate);
      if (auth) {
        const properties = asObj(auth.properties);
        const headers = properties ? asObj(properties.headers) : null;
        const authHeader = headers ? headers.Authorization ?? headers.authorization : null;
        if (typeof authHeader === "string" && /=?Bearer\s/i.test(authHeader)) bearer = true;
      }
      const testCfg = asObj(cls.test);
      const testReq = testCfg ? asObj(testCfg.request) : null;
      if (testReq) {
        const base = typeof testReq.baseURL === "string" ? testReq.baseURL : "";
        const path = typeof testReq.url === "string" ? testReq.url : "";
        if (base || path) testUrl = `${base}${path}`;
      }
      return {
        key: kebab(credentialName),
        displayName: typeof cls.displayName === "string" ? cls.displayName : credentialName,
        fields,
        apiKeyField: apiKeyField ?? (fields[0]?.key ?? null),
        bearer,
        testUrl,
      };
    } catch {
      continue;
    }
  }
  return null;
}

// ---------- main ----------

async function main() {
  const args = parseArgs(Deno.args);
  const ref = parseGitHubRef(args.from, args.ref);

  console.log(`Listing ${ref.owner}/${ref.repo}/${ref.path}@${ref.ref}…`);
  const entries = await ghList(ref);
  const tsFiles = entries.filter((e) => e.type === "file" && e.name.endsWith(".ts"));

  // Fetch + parse every file. Build the array registry from all of them so
  // spreads in the node file can be resolved without tracking imports.
  const parsedFiles: ParsedFile[] = [];
  for (const e of tsFiles) {
    if (!e.download_url) continue;
    const text = await ghText(e.download_url);
    parsedFiles.push(parseSourceFile(e.name, text));
  }
  const registry: Record<string, JsValue[]> = {};
  for (const f of parsedFiles) Object.assign(registry, f.exportedArrays);

  const nodeFile = parsedFiles.find((f) => f.classDescription !== null);
  if (!nodeFile?.classDescription) throw new Error("No INodeType class with `description` found.");
  const description = nodeFile.classDescription;

  const displayName = typeof description.displayName === "string" ? description.displayName : "App";
  const name = typeof description.name === "string" ? description.name : displayName.toLowerCase();
  const oneLine = typeof description.description === "string" ? description.description : "";
  const slug = kebab(name);
  const appId = args.id ?? `io.w6w.${slug}`;

  // Resolve the property tree.
  const properties = Array.isArray(description.properties)
    ? resolveSpreads(description.properties as JsValue[], registry)
    : [];
  const { resources, operations } = partition(properties);

  // Credentials.
  const credEntries = Array.isArray(description.credentials) ? description.credentials : [];
  const credInfos: CredInfo[] = [];
  for (const c of credEntries as JsValue[]) {
    const obj = asObj(c);
    if (!obj || typeof obj.name !== "string") continue;
    console.log(`Looking up credential ${obj.name}…`);
    const info = await loadCredential(obj.name, args, ref);
    if (info) credInfos.push(info);
  }

  // Resolve output paths.
  const outDir = args.to.startsWith("/")
    ? args.to
    : `${Deno.cwd().replace(/\/$/, "")}/${args.to.replace(/^\.\//, "")}`;
  await Deno.mkdir(`${outDir}/actions`, { recursive: true });
  if (credInfos.length > 0) await Deno.mkdir(`${outDir}/auth`, { recursive: true });

  // package.json.
  const pkg = {
    name: `@w6w-apps/${slug}`,
    version: "0.1.0",
    description: oneLine || `Generated from n8n ${displayName}.`,
    license: "MIT",
    author: { name: "w6w" },
    private: true,
    w6w: {
      id: appId,
      displayName,
      categories: ["generated"],
      appearance: { icon: { svg: `./assets/${slug}.svg` } },
      entry: "./index.ts",
    },
  };
  await Deno.writeTextFile(`${outDir}/package.json`, JSON.stringify(pkg, null, 2) + "\n");

  // tsconfig.json.
  const tsconfig = {
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "Bundler",
      allowImportingTsExtensions: true,
      verbatimModuleSyntax: true,
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      lib: ["ES2022", "DOM"],
      types: [],
      baseUrl: ".",
      paths: { "@w6w/types": ["../../core/packages/types"] },
    },
    include: ["index.ts", "actions/**/*.ts", "auth/**/*.ts"],
  };
  await Deno.writeTextFile(`${outDir}/tsconfig.json`, JSON.stringify(tsconfig, null, 2) + "\n");

  // Actions.
  const actionFiles: { fileKey: string; importName: string }[] = [];
  for (const op of operations) {
    const key = kebab(`${op.resource}-${op.operation}`);
    const params: W6wParam[] = [];
    for (const f of op.fields) {
      const param = toParam(f);
      if (param) params.push(param);
    }
    const sourceUrl =
      `https://github.com/${ref.owner}/${ref.repo}/tree/${ref.ref}/${ref.path}`;
    const code = emitAction({
      fileKey: key,
      key,
      title: op.display.action ?? op.display.name,
      description: op.display.description,
      resource: op.resource,
      operation: op.operation,
      params,
      sourceUrl,
    });
    const fileName = `${key}.ts`;
    await Deno.writeTextFile(`${outDir}/actions/${fileName}`, code);
    actionFiles.push({
      fileKey: key,
      importName: key.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()),
    });
  }

  // Auth.
  const authFiles: { fileKey: string; importName: string }[] = [];
  for (const c of credInfos) {
    const code = emitAuth(c);
    const fileName = `${c.key}.ts`;
    await Deno.writeTextFile(`${outDir}/auth/${fileName}`, code);
    authFiles.push({
      fileKey: c.key,
      importName: c.key.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()),
    });
  }

  // index.ts.
  const importLines: string[] = [`import type { AppDefinition } from "@w6w/types";`];
  for (const a of actionFiles) importLines.push(`import ${a.importName} from "./actions/${a.fileKey}.ts";`);
  for (const a of authFiles) importLines.push(`import ${a.importName} from "./auth/${a.fileKey}.ts";`);
  const actionsArr = actionFiles.map((a) => a.importName).join(", ");
  const authArr = authFiles.map((a) => a.importName).join(", ");
  const index = `${importLines.join("\n")}

export default {
  actions: [${actionsArr}],
${authFiles.length > 0 ? `  auth: [${authArr}],\n` : ""}} satisfies AppDefinition;
`;
  await Deno.writeTextFile(`${outDir}/index.ts`, index);

  console.log(
    `\nWrote ${actionFiles.length} action(s) and ${authFiles.length} auth method(s) to ${outDir}.`,
  );
  console.log(
    `Resources detected: ${resources.map((r) => r.value).join(", ") || "(none)"}.\n`,
  );
  console.log("Next steps: review the generated execute() stubs and replace them with real ctx.fetch calls.");
}

if (import.meta.main) {
  await main();
}
