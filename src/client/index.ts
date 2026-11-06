/**
 * Russian language pack, browser half. Registers the `ru` language
 * definition (fallback: en) and one dictionary per namespace the shipped web
 * GUI owns. Lookup walks ru -> en inside the namespace, then the shared
 * common namespace, so a key this pack has not translated yet surfaces in
 * English rather than as a raw key. Key parity with every owner's shipped
 * dictionary is asserted by tests/dictionaries.client.spec.ts.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the locale service merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import * as agentPreset from './dictionaries/agent-preset.ts'
import * as agentTeam from './dictionaries/agent-team.ts'
import * as approval from './dictionaries/approval.ts'
import * as chat from './dictionaries/chat.ts'
import * as commands from './dictionaries/commands.ts'
import * as common from './dictionaries/common.ts'
import * as conversation from './dictionaries/conversation.ts'
import * as cordis from './dictionaries/cordis.ts'
import * as deliverables from './dictionaries/deliverables.ts'
import * as directoryBrowser from './dictionaries/directory-browser.ts'
import * as documentCode from './dictionaries/document-code.ts'
import * as documentHtml from './dictionaries/document-html.ts'
import * as documentImage from './dictionaries/document-image.ts'
import * as documentMarkdown from './dictionaries/document-markdown.ts'
import * as documentOffice from './dictionaries/document-office.ts'
import * as documentPdf from './dictionaries/document-pdf.ts'
import * as documentPreview from './dictionaries/document-preview.ts'
import * as goal from './dictionaries/goal.ts'
import * as inputTrigger from './dictionaries/input-trigger.ts'
import * as jobs from './dictionaries/jobs.ts'
import * as messageFeedback from './dictionaries/message-feedback.ts'
import * as modelSelection from './dictionaries/model-selection.ts'
import * as openInApp from './dictionaries/open-in-app.ts'
import * as permissionAccess from './dictionaries/permission-access.ts'
import * as permissionSettings from './dictionaries/permission-settings.ts'
import * as plan from './dictionaries/plan.ts'
import * as pluginManager from './dictionaries/plugin-manager.ts'
import * as reference from './dictionaries/reference.ts'
import * as schedule from './dictionaries/schedule.ts'
import * as sessionLogDownload from './dictionaries/session-log-download.ts'
import * as settingsAccount from './dictionaries/settings-account.ts'
import * as settingsAgentLoop from './dictionaries/settings-agent-loop.ts'
import * as settingsGeneral from './dictionaries/settings-general.ts'
import * as settingsLocale from './dictionaries/settings-locale.ts'
import * as settingsModels from './dictionaries/settings-models.ts'
import * as settingsPluginInventory from './dictionaries/settings-plugin-inventory.ts'
import * as settingsPlugins from './dictionaries/settings-plugins.ts'
import * as settingsShell from './dictionaries/settings-shell.ts'
import * as settingsSubagent from './dictionaries/settings-subagent.ts'
import * as settingsTheme from './dictionaries/settings-theme.ts'
import * as settingsWebSearch from './dictionaries/settings-web-search.ts'
import * as shortcuts from './dictionaries/shortcuts.ts'
import * as sidebar from './dictionaries/sidebar.ts'
import * as sidebarBrowser from './dictionaries/sidebar-browser.ts'
import * as sidebarExcel from './dictionaries/sidebar-excel.ts'
import * as sidebarFiles from './dictionaries/sidebar-files.ts'
import * as sidebarRight from './dictionaries/sidebar-right.ts'
import * as sidebarTerminal from './dictionaries/sidebar-terminal.ts'
import * as skill from './dictionaries/skill.ts'
import * as subagent from './dictionaries/subagent.ts'
import * as trajectory from './dictionaries/trajectory.ts'
import * as userQuestions from './dictionaries/user-questions.ts'
import * as voiceInput from './dictionaries/voice-input.ts'
import * as workflowRun from './dictionaries/workflow-run.ts'
import * as workspace from './dictionaries/workspace.ts'
import * as pluginAgentTeams from './dictionaries/plugins/agentTeams.ts'
import * as pluginCodegraph from './dictionaries/plugins/codegraph.ts'
import * as pluginDocker from './dictionaries/plugins/docker.ts'
import * as pluginDshMarket from './dictionaries/plugins/dsh-market.ts'
import * as pluginKitSettings from './dictionaries/plugins/kit-settings.ts'
import * as pluginLoglens from './dictionaries/plugins/loglens.ts'
import * as pluginMcp from './dictionaries/plugins/mcp.ts'
import * as pluginRss from './dictionaries/plugins/rss.ts'
import * as pluginTty from './dictionaries/plugins/tty.ts'

/** One shipped dictionary contribution: namespace id plus ru entries. */
interface Pack {
  /** Registered namespace id, matching the owner's declaration. */
  readonly ns: string
  /** Russian entries with key parity against the owner's dictionaries. */
  readonly dict: Record<string, string>
}

/** Core web GUI namespaces: registered as one strict transaction. */
const CORE_PACKS: readonly Pack[] = [
  common,
  settingsLocale,
  settingsGeneral,
  settingsTheme,
  settingsModels,
  settingsPlugins,
  settingsPluginInventory,
  settingsAgentLoop,
  settingsShell,
  settingsSubagent,
  settingsWebSearch,
  settingsAccount,
  shortcuts,
  voiceInput,
  agentPreset,
  agentTeam,
  permissionSettings,
  permissionAccess,
  approval,
  chat,
  conversation,
  cordis,
  commands,
  inputTrigger,
  deliverables,
  directoryBrowser,
  goal,
  jobs,
  messageFeedback,
  modelSelection,
  openInApp,
  plan,
  pluginManager,
  reference,
  schedule,
  sessionLogDownload,
  sidebar,
  sidebarRight,
  sidebarFiles,
  sidebarBrowser,
  sidebarTerminal,
  documentPreview,
  documentCode,
  documentHtml,
  documentImage,
  documentMarkdown,
  documentOffice,
  documentPdf,
  sidebarExcel,
  skill,
  subagent,
  trajectory,
  userQuestions,
  workflowRun,
  workspace,
]

/**
 * Namespaces owned by optional plugins (tty, docker, loglens, …). They are
 * registered tolerantly: a plugin that is not installed simply never looks the
 * namespace up, and a namespace some other registration already claimed (a
 * plugin shipping its own ru, or a second copy of this pack) must not take the
 * remaining dictionaries down with it.
 */
const PLUGIN_PACKS: readonly Pack[] = [
  pluginCodegraph,
  pluginMcp,
  pluginRss,
  pluginLoglens,
  pluginKitSettings,
  pluginTty,
  pluginDocker,
  pluginDshMarket,
  pluginAgentTeams,
]

/** Stable id and selector label of the language this pack adds. */
const RU_ID = 'ru'
const RU_LABEL = 'Русский'

/** Required cordis services: the locale service this pack extends. */
export const inject = ['locale']

/**
 * Client plugin body: register the ru language definition and every shipped
 * dictionary as one transactional effect. The core namespaces are all-or-
 * nothing — a namespace already owned by a rival registration rolls the core
 * set back instead of squatting the remaining seats. Plugin namespaces are
 * registered one by one: a conflict there is reported and skipped, because an
 * optional plugin (or the same plugin shipping its own ru) is not a reason to
 * lose the rest of the pack.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    const disposers: (() => void)[] = [
      ctx.locale.addLanguage({ id: RU_ID, label: RU_LABEL, fallback: 'en' }),
    ]
    try {
      for (const pack of CORE_PACKS) disposers.push(ctx.locale.register(pack.ns, RU_ID, pack.dict))
    } catch (error) {
      for (const dispose of disposers.reverse()) dispose()
      throw error
    }
    for (const pack of PLUGIN_PACKS) {
      try {
        disposers.push(ctx.locale.register(pack.ns, RU_ID, pack.dict))
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        console.warn(`[dsh-locale-ru] namespace "${pack.ns}" was not registered (${reason}); its strings stay in English`)
      }
    }
    return () => { for (const dispose of disposers) dispose() }
  }, 'locale-ru: language and dictionaries')
}
