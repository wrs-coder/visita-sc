# Architecture decisions

- Keep Bible popover appearance preferences in the existing local settings store and only presentation state in the popover component, because imported scripture and saved highlights must remain unchanged.
- Native attachment writes go through chunked Filesystem writeFile/appendFile in outline-attachments.ts, because sending a whole file as one base64 string overflows the Capacitor bridge.
- Collapsible outline topics are a TipTap block node wrapping ordinary blocks (div[data-type=outline-topic]), with collapsed state kept only in device localStorage, so formatting, indent and Bible-ref detection keep working unchanged.
- Collapse/expand state in visit tabs is device-local presentation state (localStorage via collapsible-blocks.tsx); collapsed content is hidden, never unmounted, so drafts and unsaved inputs survive.
