# @justanarthur/modo-ui-ai

An AI agent app kit on [modo-ui](https://www.npmjs.com/package/@justanarthur/modo-ui):
the pieces of a desktop app for coding agents — messages, tool calls,
permission and question prompts, a composer, a transcript that follows a
streaming reply, side panes, settings and the screens they make up. Every
visual comes from modo-ui's tokens and items; the kit adds no tokens of its own.

**Live docs:** https://justanarthur.github.io/modo/ai/ — every component,
block and screen with its props and live examples, built with
[modo](https://github.com/justAnArthur/modo).

## Install

```sh
npm install @justanarthur/modo-ui-ai @justanarthur/modo-ui
```

`@justanarthur/modo-ui` (1.1 or later), `react` and `react-dom` (18 or later)
are peer dependencies: the kit renders modo-ui's own components and shares
their contexts (size, shape, surface, icons) with the rest of your app.

```tsx
import { Message, ToolCall, Transcript } from '@justanarthur/modo-ui-ai'
import Composer from '@justanarthur/modo-ui-ai/blocks/composer'
```

Subpaths follow the docs' tiers: `components/*` (`components/message`,
`components/tool-call`, …) and `blocks/*` (`blocks/transcript`,
`blocks/side-pane`, `blocks/settings/hooks`, …), plus `lib/icons` and the pure
`lib/pace` (how a usage limit reads against the time left).

## Styles

Set up modo-ui's styles first ([its README](https://www.npmjs.com/package/@justanarthur/modo-ui)),
then add the kit's classes the same way:

- **Prebuilt CSS:** load the kit's utilities after modo-ui's stylesheet.

  ```ts
  import '@justanarthur/modo-ui/styles.css'
  import '@justanarthur/modo-ui-ai/styles.css'
  ```

- **Tailwind CSS v4:** scan the kit's `dist/` beside modo-ui's.

  ```css
  @import "tailwindcss";
  @import "@justanarthur/modo-ui/tailwind.css";
  @source "../node_modules/@justanarthur/modo-ui-ai/dist";
  ```

- **UnoCSS:** with modo-ui's preset, add the kit's built files to `content`
  (for example `content: { filesystem: ['node_modules/@justanarthur/modo-ui-ai/dist/**/*.js'] }`).

## Icons

The kit's items read modo-ui's icon set and some glyphs of their own (tools,
panes, settings sections). Swap modo-ui's with its `IconProvider` and the
kit's with `AiIconProvider`:

```tsx
import { AiIconProvider } from '@justanarthur/modo-ui-ai'
import { IconProvider } from '@justanarthur/modo-ui'

<IconProvider icons={{ search: MySearch }}>
  <AiIconProvider icons={{ terminal: MyTerminal }}>{app}</AiIconProvider>
</IconProvider>
```

## What's inside

- **Components:** `Message` (+ `Message.Working`, the streaming dots),
  `ToolCall`, `AgentRun`, `Reasoning`, `WorkSummary`, `TodoList`, `Recap`,
  `ChapterNav`, `PromptCard`, `PermissionRequest`, `QuestionPrompt`,
  `PlanApproval`.
- **Blocks:** the session (`Transcript`, `Composer`, `AgentPrompt`,
  `TranscriptSearch`, `CommandPalette`, `ShortcutsSheet`, `FailureState`), the
  sidebars and boards (`SessionSidebar`, `SessionBoard`, `Inbox`,
  `ProfileSwitcher`, `ProfileUsage`, `ProfileOnboarding`), the side pane and
  its panes (`SidePane`, `ChangesPane`, `FilePane`, `TerminalPane`,
  `PullRequestPane`, `ArtifactsPane`, `TasksPane`, `UsagePane`), and settings
  (`SettingsWindow` with its sections, `PermissionRules`, `HookDialog`,
  `McpServerDialog`, `PluginCatalog`).
- **Screens** (docs only, on mock data): the workspace window, the overview,
  a new session, profiles, settings and every interaction prompt.

The components follow modo-ui's conventions: `value` / `defaultValue` /
`onValueChange`, `open` / `defaultOpen` / `onOpenChange`, sizes on its ladder
and every overlay grown out of its trigger.

## Licence

MIT © 2026 justAnArthur. Built on modo-ui, which ports
[Fluid Functionalism](https://www.fluidfunctionalism.com) (MIT © 2026 Micka Touillaud).
