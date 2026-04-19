import { execFile } from "node:child_process"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { promisify } from "node:util"
import { createOpencodeClient } from "@opencode-ai/sdk"

type ModelRef = {
  providerID: string
  modelID: string
}

type FleetConfig = {
  defaults?: {
    agent?: string
    model?: string
  }
  repos: RepoConfig[]
}

type RepoConfig = {
  id: string
  name?: string
  baseUrl: string
  path?: string
  username?: string
  password?: string
  passwordEnv?: string
  defaultAgent?: string
  defaultModel?: string
}

type FleetState = {
  version: 1
  workflows: Record<string, WorkflowState>
}

type WorkflowState = {
  createdAt: string
  updatedAt: string
  repos: Record<string, RepoWorkflowState>
}

type RepoWorkflowState = {
  sessionId: string
  title: string
  lastPromptAt?: string
}

type ParsedArgs = {
  command: string
  positionals: string[]
  flags: Record<string, string | boolean>
}

type ImpactResult = {
  repo: string
  sessionId: string
  structured: Record<string, unknown> | null
  text: string
}

type SyncResult = {
  repo: string
  sessionId: string | null
  healthy: boolean
  version: string
  branch: string | null
  dirty: boolean | null
  changedFiles: string[]
  lastAssistantText: string
}

const DEFAULT_CONFIG_PATH = path.resolve(process.cwd(), "repos.json")
const DEFAULT_STATE_PATH = path.resolve(process.cwd(), ".fleet-state.json")
const DEFAULT_TRACKER_PATH = path.resolve(process.cwd(), "change-tracker.md")
const execFileAsync = promisify(execFile)

const IMPACT_RESPONSE_SHAPE = `{
  "impacted": boolean,
  "summary": string,
  "filesOrAreas": string[],
  "risks": string[],
  "blockers": string[],
  "rolloutOrder": number | null,
  "tests": string[],
  "recommendedNextPrompt": string
}`

async function main() {
  const parsed = parseArgs(process.argv.slice(2))

  switch (parsed.command) {
    case "list":
      await handleList(await loadConfig(resolveFilePath(parsed.flags.config, DEFAULT_CONFIG_PATH)))
      return
    case "status":
      await handleStatus(
        await loadConfig(resolveFilePath(parsed.flags.config, DEFAULT_CONFIG_PATH)),
        await loadState(resolveFilePath(parsed.flags.state, DEFAULT_STATE_PATH)),
        parsed
      )
      return
    case "impact":
      await handleImpact(
        await loadConfig(resolveFilePath(parsed.flags.config, DEFAULT_CONFIG_PATH)),
        await loadState(resolveFilePath(parsed.flags.state, DEFAULT_STATE_PATH)),
        resolveFilePath(parsed.flags.state, DEFAULT_STATE_PATH),
        parsed
      )
      return
    case "prompt":
      await handlePrompt(
        await loadConfig(resolveFilePath(parsed.flags.config, DEFAULT_CONFIG_PATH)),
        await loadState(resolveFilePath(parsed.flags.state, DEFAULT_STATE_PATH)),
        resolveFilePath(parsed.flags.state, DEFAULT_STATE_PATH),
        parsed
      )
      return
    case "sync":
      await handleSync(
        await loadConfig(resolveFilePath(parsed.flags.config, DEFAULT_CONFIG_PATH)),
        await loadState(resolveFilePath(parsed.flags.state, DEFAULT_STATE_PATH)),
        resolveFilePath(parsed.flags.tracker, DEFAULT_TRACKER_PATH),
        parsed
      )
      return
    case "help":
    case "--help":
    case "-h":
    default:
      printUsage()
      return
  }
}

async function handleList(config: FleetConfig) {
  for (const repo of config.repos) {
    console.log(`${repo.id}\t${repo.baseUrl}${repo.path ? `\t${repo.path}` : ""}`)
  }
}

async function handleStatus(config: FleetConfig, state: FleetState, parsed: ParsedArgs) {
  const workflow = parsed.positionals[0]
  const results = await Promise.all(
    config.repos.map(async (repo) => {
      const health = await getHealth(repo)
      const savedSessionId = workflow ? state.workflows[workflow]?.repos[repo.id]?.sessionId : undefined
      return {
        repo: repo.id,
        url: repo.baseUrl,
        healthy: health.healthy,
        version: health.version,
        sessionId: savedSessionId ?? null
      }
    })
  )

  if (parsed.flags.json) {
    console.log(JSON.stringify({ workflow: workflow ?? null, repos: results }, null, 2))
    return
  }

  for (const result of results) {
    const sessionText = result.sessionId ?? "-"
    console.log(`${result.repo}\thealthy=${String(result.healthy)}\tversion=${result.version}\tsession=${sessionText}`)
  }
}

async function handleImpact(config: FleetConfig, state: FleetState, statePath: string, parsed: ParsedArgs) {
  const workflow = parsed.positionals[0]
  const prompt = parsed.positionals.slice(1).join(" ").trim()
  ensure(workflow, "Missing workflow name. Example: impact auth-v2 \"Your prompt\"")
  ensure(prompt, "Missing prompt text. Example: impact auth-v2 \"Your prompt\"")

  const results = await Promise.all(
    config.repos.map(async (repo) => {
      const client = createClient(repo)
      const sessionId = await ensureSession({
        client,
        repo,
        config,
        state,
        workflow,
        forceNew: Boolean(parsed.flags["new-session"]),
        statePath
      })
      const response = unwrap(
        await client.session.prompt({
          path: { id: sessionId },
          body: buildPromptBody({
            agent: resolveAgent(repo, config, parsed.flags.agent),
            model: resolveModel(repo, config, parsed.flags.model),
            prompt: buildImpactPrompt(repo, prompt)
          })
        } as any)
      )
      markPrompted(state, workflow, repo.id)
      const structured = extractStructuredOutput(response)
      const text = extractText(response)
      return {
        repo: repo.id,
        sessionId,
        structured,
        text
      } satisfies ImpactResult
    })
  )

  await saveState(statePath, state)

  if (parsed.flags.json) {
    console.log(JSON.stringify({ workflow, results }, null, 2))
    return
  }

  console.log(`# Impact analysis for ${workflow}`)
  for (const result of results) {
    const impacted = result.structured?.impacted
    console.log(`\n## ${result.repo}`)
    console.log(`session: ${result.sessionId}`)
    console.log(`impacted: ${String(impacted)}`)
    if (result.structured) {
      printImpactSection("summary", result.structured.summary)
      printImpactSection("filesOrAreas", result.structured.filesOrAreas)
      printImpactSection("risks", result.structured.risks)
      printImpactSection("blockers", result.structured.blockers)
      printImpactSection("rolloutOrder", result.structured.rolloutOrder)
      printImpactSection("tests", result.structured.tests)
      printImpactSection("recommendedNextPrompt", result.structured.recommendedNextPrompt)
    } else {
      console.log(result.text || "No response text returned.")
    }
  }
}

async function handlePrompt(config: FleetConfig, state: FleetState, statePath: string, parsed: ParsedArgs) {
  const repoId = parsed.positionals[0]
  const workflow = parsed.positionals[1]
  const prompt = parsed.positionals.slice(2).join(" ").trim()
  ensure(repoId, "Missing repo id. Example: prompt repo-a auth-v2 \"Your prompt\"")
  ensure(workflow, "Missing workflow name. Example: prompt repo-a auth-v2 \"Your prompt\"")
  ensure(prompt, "Missing prompt text. Example: prompt repo-a auth-v2 \"Your prompt\"")

  const repo = config.repos.find((item) => item.id === repoId)
  ensure(repo, `Unknown repo: ${repoId}`)

  const client = createClient(repo)
  const sessionId = await ensureSession({
    client,
    repo,
    config,
    state,
    workflow,
    forceNew: Boolean(parsed.flags["new-session"]),
    statePath
  })
  const response = unwrap(
    await client.session.prompt({
      path: { id: sessionId },
      body: buildPromptBody({
        agent: resolveAgent(repo, config, parsed.flags.agent),
        model: resolveModel(repo, config, parsed.flags.model),
        prompt
      })
    })
  )
  markPrompted(state, workflow, repo.id)
  await saveState(statePath, state)

  if (parsed.flags.json) {
    console.log(JSON.stringify({ repo: repo.id, sessionId, response }, null, 2))
    return
  }

  console.log(`# ${repo.id}`)
  console.log(`session: ${sessionId}`)
  const text = extractText(response)
  console.log(text || JSON.stringify(response, null, 2))
}

async function handleSync(config: FleetConfig, state: FleetState, trackerPath: string, parsed: ParsedArgs) {
  const workflow = parsed.positionals[0]
  ensure(workflow, "Missing workflow name. Example: sync auth-v2")

  const workflowState = state.workflows[workflow]
  ensure(workflowState, `Unknown workflow: ${workflow}`)

  const results = await Promise.all(
    config.repos.map(async (repo) => {
      const health = await getHealth(repo)
      const sessionId = workflowState.repos[repo.id]?.sessionId ?? null
      const repoPath = repo.path ? path.resolve(process.cwd(), repo.path) : null
      const [branch, dirty] = repoPath ? await getRepoBranchAndDirty(repoPath) : [null, null]
      const changedFiles = sessionId ? await getChangedFiles(repo, sessionId) : []
      const lastAssistantText = sessionId ? await getLastAssistantText(repo, sessionId) : ""

      return {
        repo: repo.id,
        sessionId,
        healthy: health.healthy,
        version: health.version,
        branch,
        dirty,
        changedFiles,
        lastAssistantText
      } satisfies SyncResult
    })
  )

  await syncTracker(trackerPath, workflow, results)

  if (parsed.flags.json) {
    console.log(JSON.stringify({ workflow, trackerPath, results }, null, 2))
    return
  }

  console.log(`# Synced workflow ${workflow}`)
  console.log(`tracker: ${trackerPath}`)
  for (const result of results) {
    console.log(`\n## ${result.repo}`)
    console.log(`session: ${result.sessionId ?? "-"}`)
    console.log(`healthy: ${String(result.healthy)} (${result.version})`)
    console.log(`branch: ${result.branch ?? "-"}`)
    console.log(`dirty: ${result.dirty === null ? "-" : String(result.dirty)}`)
    console.log(`changedFiles: ${result.changedFiles.length > 0 ? result.changedFiles.join(" | ") : "-"}`)
    console.log(`lastAssistantText: ${result.lastAssistantText || "-"}`)
  }
}

async function ensureSession(args: {
  client: ReturnType<typeof createClient>
  repo: RepoConfig
  config: FleetConfig
  state: FleetState
  workflow: string
  forceNew: boolean
  statePath: string
}) {
  const existing = args.state.workflows[args.workflow]?.repos[args.repo.id]?.sessionId
  if (!args.forceNew && existing) {
    try {
      await args.client.session.get({ path: { id: existing } })
      return existing
    } catch {
      // Ignore and create a new session.
    }
  }

  const title = `${args.workflow} :: ${args.repo.name ?? args.repo.id}`
  const created = unwrap(
    await args.client.session.create({
      body: {
        title
      }
    })
  )
  const workflowState = ensureWorkflowState(args.state, args.workflow)
  workflowState.repos[args.repo.id] = {
    sessionId: created.id,
    title,
    lastPromptAt: undefined
  }
  workflowState.updatedAt = new Date().toISOString()
  await saveState(args.statePath, args.state)
  return created.id as string
}

function ensureWorkflowState(state: FleetState, workflow: string) {
  const now = new Date().toISOString()
  state.workflows[workflow] ??= {
    createdAt: now,
    updatedAt: now,
    repos: {}
  }
  return state.workflows[workflow]
}

function markPrompted(state: FleetState, workflow: string, repoId: string) {
  const workflowState = ensureWorkflowState(state, workflow)
  const repoState = workflowState.repos[repoId]
  if (repoState) {
    repoState.lastPromptAt = new Date().toISOString()
  }
  workflowState.updatedAt = new Date().toISOString()
}

function createClient(repo: RepoConfig) {
  const authorization = buildAuthorizationHeader(repo)
  return createOpencodeClient({
    baseUrl: repo.baseUrl,
    throwOnError: true,
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestHeaders = input instanceof Request ? input.headers : undefined
      const headers = new Headers(requestHeaders)
      if (init?.headers) {
        for (const [key, value] of new Headers(init.headers).entries()) {
          headers.set(key, value)
        }
      }
      if (authorization) {
        headers.set("Authorization", authorization)
      }
      return fetch(input, {
        ...init,
        headers
      })
    }
  })
}

async function getHealth(repo: RepoConfig) {
  return fetchJson<{ healthy: boolean; version: string }>(repo, "/global/health")
}

async function fetchJson<T>(repo: RepoConfig, pathname: string, init?: RequestInit) {
  const headers = new Headers(init?.headers ?? undefined)
  const authorization = buildAuthorizationHeader(repo)
  if (authorization) {
    headers.set("Authorization", authorization)
  }
  const response = await fetch(new URL(pathname, repo.baseUrl), {
    ...init,
    headers
  })
  if (!response.ok) {
    throw new Error(`${repo.id} request failed with ${response.status} ${response.statusText}`)
  }
  return (await response.json()) as T
}

function buildAuthorizationHeader(repo: RepoConfig) {
  const password = repo.password ?? (repo.passwordEnv ? process.env[repo.passwordEnv] : undefined)
  if (!password) {
    return null
  }
  const username = repo.username ?? "opencode"
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`
}

function resolveAgent(repo: RepoConfig, config: FleetConfig, override: string | boolean | undefined) {
  if (typeof override === "string") {
    return override
  }
  return repo.defaultAgent ?? config.defaults?.agent ?? "build"
}

function resolveModel(repo: RepoConfig, config: FleetConfig, override: string | boolean | undefined) {
  const value = typeof override === "string" ? override : repo.defaultModel ?? config.defaults?.model
  if (!value) {
    return undefined
  }
  const [providerID, ...rest] = value.split("/")
  ensure(providerID && rest.length > 0, `Model must be provider/model, got: ${value}`)
  return {
    providerID,
    modelID: rest.join("/")
  } satisfies ModelRef
}

function buildImpactPrompt(repo: RepoConfig, prompt: string) {
  return [
    `You are assessing the impact of a cross-repo change for this repository only (${repo.name ?? repo.id}).`,
    "Evaluate the current repository context and identify whether it needs changes.",
    "Focus on interfaces, contracts, environment variables, deployment sequencing, migration risks, and verification work.",
    "Be concrete and repo-local. Do not speculate about unrelated repositories except when noting dependencies or rollout order.",
    "Respond with valid JSON only. Do not wrap it in markdown fences.",
    `Use exactly this shape: ${IMPACT_RESPONSE_SHAPE}`,
    "",
    "Proposed change:",
    prompt
  ].join("\n")
}

function buildPromptBody(args: { agent: string; model: ModelRef | undefined; prompt: string }) {
  return {
    agent: args.agent,
    ...(args.model ? { model: args.model } : {}),
    parts: [
      {
        type: "text" as const,
        text: args.prompt
      }
    ]
  }
}

function extractStructuredOutput(response: any) {
  const structured = response?.info?.structured_output ?? response?.structured_output
  if (structured) {
    return structured
  }

  const text = extractText(response)
  if (!text) {
    return null
  }

  const candidate = extractJsonObject(text)
  if (!candidate) {
    return null
  }

  try {
    return JSON.parse(candidate) as Record<string, unknown>
  } catch {
    return null
  }
}

function extractText(response: any) {
  const parts = response?.parts
  if (!Array.isArray(parts)) {
    return ""
  }
  return parts
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join("\n\n")
}

function extractJsonObject(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i) ?? text.match(/```\s*([\s\S]*?)```/)
  if (fenced?.[1]) {
    return fenced[1].trim()
  }

  const firstBrace = text.indexOf("{")
  const lastBrace = text.lastIndexOf("}")
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return null
  }

  return text.slice(firstBrace, lastBrace + 1).trim()
}

function printImpactSection(label: string, value: unknown) {
  if (Array.isArray(value)) {
    console.log(`${label}: ${value.length > 0 ? value.join(" | ") : "-"}`)
    return
  }
  if (value === null || value === undefined || value === "") {
    console.log(`${label}: -`)
    return
  }
  console.log(`${label}: ${String(value)}`)
}

function unwrap<T>(response: { data?: T } | T): T {
  if (response && typeof response === "object" && "data" in (response as Record<string, unknown>)) {
    return (response as { data: T }).data
  }
  return response as T
}

async function getChangedFiles(repo: RepoConfig, sessionId: string) {
  const client = createClient(repo)
  const response = unwrap(await client.session.diff({ path: { id: sessionId } })) as Array<{
    path?: { file?: string }
    file?: { path?: string }
  }>

  return response
    .map((item) => item?.path?.file ?? item?.file?.path)
    .filter((value): value is string => typeof value === "string" && value.length > 0)
}

async function getLastAssistantText(repo: RepoConfig, sessionId: string) {
  const client = createClient(repo)
  const response = unwrap(await client.session.messages({ path: { id: sessionId }, query: { limit: 20 } })) as Array<{
    info?: { role?: string }
    parts?: Array<{ type?: string; text?: string }>
  }>

  for (let index = response.length - 1; index >= 0; index -= 1) {
    const message = response[index]
    if (message?.info?.role !== "assistant") {
      continue
    }

    const text = (message.parts ?? [])
      .filter((part) => part?.type === "text" && typeof part.text === "string")
      .map((part) => part.text!.trim())
      .filter(Boolean)
      .join("\n\n")

    if (text) {
      return text
    }
  }

  return ""
}

async function getRepoBranchAndDirty(repoPath: string): Promise<[string | null, boolean | null]> {
  try {
    const branch = await execFileAsync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: repoPath })
    const status = await execFileAsync("git", ["status", "--short"], { cwd: repoPath })
    return [branch.stdout.trim() || null, status.stdout.trim().length > 0]
  } catch {
    return [null, null]
  }
}

async function syncTracker(trackerPath: string, workflow: string, results: SyncResult[]) {
  const raw = await readTextFile(trackerPath)
  const updated = upsertWorkflowRows(raw, workflow, results)
  if (updated !== raw) {
    await writeFile(trackerPath, updated, "utf8")
  }
}

function upsertWorkflowRows(markdown: string, workflow: string, results: SyncResult[]) {
  const heading = `## Workflow: ${workflow}`
  const start = markdown.indexOf(heading)
  if (start === -1) {
    return markdown
  }

  const next = markdown.indexOf("\n## Workflow:", start + heading.length)
  const end = next === -1 ? markdown.length : next + 1
  const section = markdown.slice(start, end)
  const updatedSection = updateWorkflowSection(section, results)
  return `${markdown.slice(0, start)}${updatedSection}${markdown.slice(end)}`
}

function updateWorkflowSection(section: string, results: SyncResult[]) {
  const lines = section.split("\n")
  const separatorIndex = lines.findIndex((line) => line.trim() === "| --- | --- | --- | --- | --- | --- |")
  if (separatorIndex === -1) {
    return section
  }

  const rowStart = separatorIndex + 1
  const rowEnd = lines.findIndex((line, index) => index >= rowStart && line.trim() === "")
  const existingRows = rowEnd === -1 ? lines.slice(rowStart) : lines.slice(rowStart, rowEnd)
  const existingByRepo = new Map(
    existingRows
      .filter((line) => line.trim().startsWith("|"))
      .map((line) => {
        const cells = line.split("|").map((cell) => cell.trim())
        return [cells[1], cells] as const
      })
  )

  const updatedRows = results.map((result) => {
    const existing = existingByRepo.get(result.repo)
    const tests = existing?.[5] || "pending"
    const pr = existing?.[6] || "pending"
    const impacted = result.sessionId ? "yes" : (existing?.[2] || "unknown")
    const session = result.sessionId ? `\`${result.sessionId}\`` : (existing?.[3] || "pending")
    const branch = result.branch ? `\`${result.branch}\`` : (existing?.[4] || "pending")
    return `| ${result.repo} | ${impacted} | ${session} | ${branch} | ${tests} | ${pr} |`
  })

  const suffix = rowEnd === -1 ? [] : lines.slice(rowEnd)
  return [...lines.slice(0, rowStart), ...updatedRows, ...suffix].join("\n")
}

async function loadConfig(configPath: string) {
  const raw = await readTextFile(configPath)
  const config = JSON.parse(raw) as FleetConfig
  ensure(Array.isArray(config.repos) && config.repos.length > 0, `No repos found in ${configPath}`)
  return config
}

async function loadState(statePath: string) {
  try {
    const raw = await readTextFile(statePath)
    const state = JSON.parse(raw) as FleetState
    state.workflows ??= {}
    state.version ??= 1
    return state
  } catch (error) {
    if (isMissingFile(error)) {
      return {
        version: 1,
        workflows: {}
      } satisfies FleetState
    }
    throw error
  }
}

async function saveState(statePath: string, state: FleetState) {
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8")
}

async function readTextFile(filePath: string) {
  return readFile(filePath, "utf8")
}

function resolveFilePath(flagValue: string | boolean | undefined, fallback: string) {
  if (typeof flagValue === "string" && flagValue.length > 0) {
    return path.resolve(process.cwd(), flagValue)
  }
  return fallback
}

function isMissingFile(error: unknown): error is NodeJS.ErrnoException {
  return error !== null && typeof error === "object" && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT"
}

function parseArgs(argv: string[]): ParsedArgs {
  if (argv.length === 0) {
    return {
      command: "help",
      positionals: [],
      flags: {}
    }
  }

  const [command, ...rest] = argv
  const positionals: string[] = []
  const flags: Record<string, string | boolean> = {}

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index]
    if (!value.startsWith("--")) {
      positionals.push(value)
      continue
    }

    const flag = value.slice(2)
    const next = rest[index + 1]
    if (!next || next.startsWith("--")) {
      flags[flag] = true
      continue
    }
    flags[flag] = next
    index += 1
  }

  return {
    command,
    positionals,
    flags
  }
}

function printUsage() {
  console.log(`Usage:
  fleet list [--config repos.json]
  fleet status [workflow] [--json]
  fleet impact <workflow> <prompt> [--agent build|plan] [--model provider/model] [--new-session] [--json]
  fleet prompt <repo> <workflow> <prompt> [--agent build|plan] [--model provider/model] [--new-session] [--json]
  fleet sync <workflow> [--tracker change-tracker.md] [--json]

Examples:
  npm run fleet -- list
  npm run fleet -- status auth-v2
  npm run fleet -- impact auth-v2 "Assess impact of auth v2"
  npm run fleet -- prompt repo-a auth-v2 "Implement repo-local auth v2 changes"
  npm run fleet -- sync auth-v2
`)
}

function ensure(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message)
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Error: ${message}`)
  process.exitCode = 1
})
