# Project instructions for Codex

The user is mainly a backend/server developer and does not know the frontend file structure, UI patterns, or data flow.

For frontend tasks, always gather context before editing.

Frontend context protocol:

1. Identify the framework, routing system, styling method, and component structure.
2. Find the relevant route/page/component files.
3. Inspect nearby components before creating new ones.
4. Inspect existing UI patterns for cards, buttons, forms, tables, dashboards, empty states, loading states, and error states.
5. Inspect existing API/data patterns, including hooks, services, clients, utilities, types, and schemas.
6. Reuse existing design patterns. Do not create a new design style unless explicitly requested.
7. Keep work-focused content near the top of role pages.
8. Move service, promotion, benefit-description, or advertisement-style content into the existing "Your Services" pattern when relevant.
9. Keep changes minimal, focused, and reviewable.
10. Do not modify backend files unless the user explicitly asks.
11. Do not change backend APIs unless explicitly approved.
12. Do not invent mock data unless the project already has a clear placeholder pattern.
13. If required data is missing, stop and explain what backend/API data is needed.
14. If the task is broad, split it into safe sub-steps and complete the safest independent part first.
15. If unsure whether something is functional or decorative, do not remove it.

For every frontend task, final response must include:

- files inspected
- files changed
- UI pattern reused
- data/API pattern used
- validation performed
- remaining risks or follow-up needed
