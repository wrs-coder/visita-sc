# Architecture decisions

- Keep Bible popover appearance preferences in the existing local settings store and only presentation state in the popover component, because imported scripture and saved highlights must remain unchanged.
- Resolve imported Bible language from EPUB metadata, edition title, and distinctive book names at display time for existing copies, because verse storage must not be rewritten for a label correction.
- Native attachment writes go through chunked Filesystem writeFile/appendFile in outline-attachments.ts, because sending a whole file as one base64 string overflows the Capacitor bridge.
- Collapsible outline topics are a TipTap block node wrapping ordinary blocks (div[data-type=outline-topic]), with collapsed state kept only in device localStorage, so formatting, indent and Bible-ref detection keep working unchanged.
- Collapse/expand state in visit tabs and template editors is device-local presentation state (localStorage via collapsible-blocks.tsx); collapsed content is hidden, never unmounted, so drafts and unsaved inputs survive.
- Pasted Word indentation is normalized once in word-paste-cleaner.ts into margin-left multiples of 32px (tabs, margins, decimal commas, list levels), so the editor and readers only consume that single format.
- DOCX outline import runs only on the device (docx-import.ts) with file-size, unzip-size and entry limits, rejects DOCTYPE/ENTITY and macros, and feeds the same Word paste normalizer and note sanitizer, because imported files are untrusted input.
- The mobile dashboard groups existing cards into swipeable pages (DashboardPager, CSS scroll-snap): the visible page mounts first, the rest mount on idle and are never unmounted, and from md up all render stacked, because card state must survive and desktop keeps the full list.
