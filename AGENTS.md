# Architecture decisions

- Keep Bible popover appearance preferences in the existing local settings store and only presentation state in the popover component, because imported scripture and saved highlights must remain unchanged.
- Resolve imported Bible language from EPUB metadata, edition title, and distinctive book names at display time for existing copies, because verse storage must not be rewritten for a label correction.
- Native attachment writes go through chunked Filesystem writeFile/appendFile in outline-attachments.ts, because sending a whole file as one base64 string overflows the Capacitor bridge.
- Collapsible outline topics are a TipTap block node wrapping ordinary blocks (div[data-type=outline-topic]), with collapsed state kept only in device localStorage, so formatting, indent and Bible-ref detection keep working unchanged.
- Collapse/expand state in visit tabs and template editors is device-local presentation state (localStorage via collapsible-blocks.tsx); collapsed content is hidden, never unmounted, so drafts and unsaved inputs survive.
- Pasted Word indentation is normalized once in word-paste-cleaner.ts into margin-left multiples of 32px (tabs, margins, decimal commas, list levels), so the editor and readers only consume that single format.
- DOCX outline import runs only on the device (docx-import.ts) with file-size, unzip-size and entry limits, rejects DOCTYPE/ENTITY and macros, and feeds the same Word paste normalizer and note sanitizer, because imported files are untrusted input.
- The dashboard groups existing cards into swipeable pages at every width (DashboardPager, CSS scroll-snap, no viewport hook so SSR matches): the visible page mounts first, the rest mount on idle and are never unmounted, because card state must survive tab switches.
- The personal outlines screen lazy-loads the TipTap editor (React.lazy + idle prewarm) so the list opens first; editor props and save flow stay unchanged.

- Guest (wife) personal workspace lives only on-device in IndexedDB (localStorage fallback) under guest.workspace.<hash of invite code>.data, with no server sync queue, and its backup reuses backup-package.ts zip format with an empty server part, so it works fully offline and stays isolated per invite code.
- DOCX export (notes and whole folders as zip) is built on-device in docx-export.ts with the existing JSZip, using 720 twips per 32px indent step so exported files re-import through docx-import.ts unchanged.
- Event reminders are device-local Capacitor local notifications planned from the same timeline items the dashboard/day summary show (event-reminders.ts), fully rescheduled on each data change with prefs in localStorage per user/guest code, because they must work offline without a push server.
- Per-topic timing stores only minutes in the outline HTML (data-minutes on outline-topic); start time, completed topics and personal-outline drafts stay device-local in localStorage, because saved content and sync format must not change.
- The per-topic time badge's visual preferences (size, opacity, position) live only in device localStorage (topic-badge-prefs.ts) and never enter outline HTML, because they are personal display settings.
- Android packaging must go through scripts that rebuild dist-app and run check-shell-fresh.mjs (build-info.json stamp vs package.json/src mtime), because plain `cap copy` ships stale screens under a new version number.
- Editor heights on the outline screen use the viewport height measured with the keyboard closed (use-stable-viewport-height.ts), because Android adjustResize shrinks dvh/vh when the keyboard opens.
- Itinerary weeks without a congregation (pioneer/free) live in their own superintendent-only table itinerary_weeks, never in visits, so elder/guest access, dashboard and visit templates stay untouched.
