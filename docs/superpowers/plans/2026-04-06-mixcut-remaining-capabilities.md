# Mixcut Remaining Capabilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the remaining Aliyun IMS scripted auto-slice upgrades so mixcut supports explicit global speech workflows, preview-only timeline feedback, exact intro/outro trimming, and surfaced speech language or SSML controls without regressing the already-landed compatibility hardening.

**Architecture:** Keep the current split between the web-side project editor and the API-side IMS config builder, but make speech mode explicit in persisted project state instead of inferring it only from per-group subtitles. For preview and exact trimming, extend the IMS provider and queue pipeline rather than adding a parallel compose path, so preview retrieval and precise clipping both stay inside the existing batch-compose lifecycle.

**Tech Stack:** Next.js 15, React 19, Zustand, NestJS, BullMQ, Prisma, Aliyun ICE/IMS OpenAPI SDK, Vitest, pnpm

---

## Non-Negotiable Decisions

- Existing worktree changes for compatibility hardening and random pools stay intact; new edits build on top of them.
- Global speech becomes an explicit project-level concept in the web store and saved draft payload, not an implicit “absence of group subtitles”.
- Group speech and global speech remain mutually exclusive in submitted API payloads.
- Preview-only jobs must return structured preview metadata or editing-project timeline data, not just a boolean flag.
- Exact clip timing uses Aliyun `MediaMetaDataArray.TimeRangeList`; do not invent a custom trimming schema that cannot map cleanly to IMS.
- Language or SSML exposure must be guarded so unsupported combinations degrade safely instead of producing invalid provider payloads.

### Task 1: Lock The Remaining Plan Into Repo State

**Files:**
- Create: `docs/superpowers/plans/2026-04-06-mixcut-remaining-capabilities.md`

- [ ] **Step 1: Save the plan document**

Write this plan into the repo so execution and later deployment use the same source of truth.

- [ ] **Step 2: Self-review the task boundaries**

Check that each task maps to a coherent deliverable and that no step requires reverting unrelated in-progress work.

- [ ] **Step 3: Commit after execution wave starts**

```bash
git add docs/superpowers/plans/2026-04-06-mixcut-remaining-capabilities.md
git commit -m "docs: add remaining mixcut capability plan"
```

### Task 2: Implement Explicit Global Speech Mode End-To-End

**Files:**
- Modify: `apps/web/src/app/(dashboard)/mixcut/_store/use-mixcut-store.ts`
- Modify: `apps/web/src/app/(dashboard)/mixcut/_components/global-config-panel.tsx`
- Modify: `apps/web/src/app/(dashboard)/mixcut/_components/config-sections/audio-music-section.tsx`
- Modify: `apps/web/src/app/(dashboard)/mixcut/_components/mixcut-editor.tsx`
- Modify: `apps/web/src/app/(dashboard)/mixcut/_components/project-list.tsx`
- Modify: `apps/web/src/app/(dashboard)/mixcut/_components/preview-panel.tsx`
- Modify: `apps/web/src/app/(dashboard)/mixcut/_components/subtitle-drawer.tsx`
- Modify: `apps/web/src/app/(dashboard)/mixcut/_components/subtitle-drawer/subtitle-content.tsx`
- Modify: `apps/web/src/app/(dashboard)/mixcut/_lib/build-mixcut-payload.ts`
- Modify: `apps/web/src/app/(dashboard)/mixcut/_lib/mixcut-compatibility.ts`
- Modify: `apps/web/src/app/(dashboard)/mixcut/_lib/mixcut-compatibility.spec.ts`
- Modify: `apps/web/src/lib/api.ts`
- Modify: `apps/api/src/digital-human/dto/create-mixcut.dto.ts`
- Modify: `apps/api/src/digital-human/digital-human.service.ts`
- Modify: `apps/api/src/digital-human/digital-human.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Add frontend and backend coverage for:
- explicit `speechMode: 'global'` projects carrying top-level `speechTexts`
- draft reload and completed-job reopen restoring global speech text into store state
- payload builder omitting per-group `speechTexts` when global speech mode is active
- API service resolving and validating explicit global speech mode correctly

- [ ] **Step 2: Run tests to verify they fail**

Run:
- `pnpm --filter @vsaas/web test -- src/app/(dashboard)/mixcut/_lib/mixcut-compatibility.spec.ts`
- `pnpm --filter @vsaas/api test -- src/digital-human/digital-human.service.spec.ts`

Expected: FAIL because project state and payload flow do not yet preserve explicit global speech data.

- [ ] **Step 3: Write minimal implementation**

Implement:
- project-level speech fields in the Zustand store
- editor UI for entering and persisting global speech pools
- explicit speech mode switching rules between global and group modes
- save/load/reopen mapping for draft and completed jobs
- updated API typings so `mixcutApi.create()` reflects the real backend contract

- [ ] **Step 4: Run tests to verify they pass**

Run:
- `pnpm --filter @vsaas/web test -- src/app/(dashboard)/mixcut/_lib/mixcut-compatibility.spec.ts`
- `pnpm --filter @vsaas/api test -- src/digital-human/digital-human.service.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(dashboard)/mixcut/_store/use-mixcut-store.ts apps/web/src/app/(dashboard)/mixcut/_components/global-config-panel.tsx apps/web/src/app/(dashboard)/mixcut/_components/config-sections/audio-music-section.tsx apps/web/src/app/(dashboard)/mixcut/_components/mixcut-editor.tsx apps/web/src/app/(dashboard)/mixcut/_components/project-list.tsx apps/web/src/app/(dashboard)/mixcut/_components/preview-panel.tsx apps/web/src/app/(dashboard)/mixcut/_components/subtitle-drawer.tsx apps/web/src/app/(dashboard)/mixcut/_components/subtitle-drawer/subtitle-content.tsx apps/web/src/app/(dashboard)/mixcut/_lib/build-mixcut-payload.ts apps/web/src/app/(dashboard)/mixcut/_lib/mixcut-compatibility.ts apps/web/src/app/(dashboard)/mixcut/_lib/mixcut-compatibility.spec.ts apps/web/src/lib/api.ts apps/api/src/digital-human/dto/create-mixcut.dto.ts apps/api/src/digital-human/digital-human.service.ts apps/api/src/digital-human/digital-human.service.spec.ts
git commit -m "feat: add explicit global speech mode for mixcut"
```

### Task 3: Return Real Preview Timeline Data For Preview-Only Jobs

**Files:**
- Modify: `apps/api/src/provider/aliyun-ims/ims-compose.provider.ts`
- Modify: `apps/api/src/provider/aliyun-ims/ims-compose.provider.spec.ts`
- Modify: `apps/api/src/queue/processors/mixcut-production.processor.ts`
- Modify: `apps/web/src/app/(dashboard)/mixcut/_components/preview-panel.tsx`
- Modify: `apps/web/src/lib/api.ts`

- [ ] **Step 1: Write the failing tests**

Add provider or processor tests that prove:
- preview-only submit path preserves `GeneratePreviewOnly`
- provider can fetch Aliyun editing project or equivalent preview timeline payload for a preview-only job
- processor persists preview timeline metadata into generation output

- [ ] **Step 2: Run tests to verify they fail**

Run:
- `pnpm --filter @vsaas/api test -- src/provider/aliyun-ims/ims-compose.provider.spec.ts`

Expected: FAIL because the provider does not yet expose preview timeline retrieval.

- [ ] **Step 3: Write minimal implementation**

Extend the IMS provider with official preview retrieval support, then update the mixcut processor to:
- detect preview-only jobs
- fetch the preview editing project or timeline after submit or completion
- store normalized preview data in `generation.output`
- let the preview panel render real timeline details instead of only synthetic local estimates

- [ ] **Step 4: Run tests to verify they pass**

Run:
- `pnpm --filter @vsaas/api test -- src/provider/aliyun-ims/ims-compose.provider.spec.ts`
- `pnpm --filter @vsaas/web build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/provider/aliyun-ims/ims-compose.provider.ts apps/api/src/provider/aliyun-ims/ims-compose.provider.spec.ts apps/api/src/queue/processors/mixcut-production.processor.ts apps/web/src/app/(dashboard)/mixcut/_components/preview-panel.tsx apps/web/src/lib/api.ts
git commit -m "feat: return real preview timeline data for mixcut"
```

### Task 4: Support Exact Intro/Outro Trimming And Clip Range Control

**Files:**
- Modify: `apps/web/src/app/(dashboard)/mixcut/_store/use-mixcut-store.ts`
- Modify: `apps/web/src/app/(dashboard)/mixcut/_components/shot-group-card.tsx`
- Modify: `apps/web/src/app/(dashboard)/mixcut/_components/preview-panel.tsx`
- Modify: `apps/web/src/app/(dashboard)/mixcut/_lib/build-mixcut-payload.ts`
- Modify: `apps/web/src/lib/api.ts`
- Modify: `apps/api/src/digital-human/dto/create-mixcut.dto.ts`
- Modify: `apps/api/src/digital-human/digital-human.service.ts`
- Modify: `apps/api/src/digital-human/digital-human.service.spec.ts`
- Modify: `apps/api/src/provider/aliyun-ims/ims-compose.provider.ts`
- Modify: `apps/api/src/provider/aliyun-ims/ims-compose.provider.spec.ts`

- [ ] **Step 1: Write the failing tests**

Add tests covering:
- per-material trim metadata surviving payload build
- provider mapping trim metadata to `MediaMetaDataArray.TimeRangeList`
- service validation rejecting invalid time ranges such as negative values or `out <= in`

- [ ] **Step 2: Run tests to verify they fail**

Run:
- `pnpm --filter @vsaas/api test -- src/digital-human/digital-human.service.spec.ts src/provider/aliyun-ims/ims-compose.provider.spec.ts`

Expected: FAIL because trim fields do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add per-material trim state in the editor, submit it through the API contract, and map it into IMS exact range metadata so intro/outro clips can be cut precisely without abusing global duration settings.

- [ ] **Step 4: Run tests to verify they pass**

Run:
- `pnpm --filter @vsaas/api test -- src/digital-human/digital-human.service.spec.ts src/provider/aliyun-ims/ims-compose.provider.spec.ts`
- `pnpm --filter @vsaas/web build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(dashboard)/mixcut/_store/use-mixcut-store.ts apps/web/src/app/(dashboard)/mixcut/_components/shot-group-card.tsx apps/web/src/app/(dashboard)/mixcut/_components/preview-panel.tsx apps/web/src/app/(dashboard)/mixcut/_lib/build-mixcut-payload.ts apps/web/src/lib/api.ts apps/api/src/digital-human/dto/create-mixcut.dto.ts apps/api/src/digital-human/digital-human.service.ts apps/api/src/digital-human/digital-human.service.spec.ts apps/api/src/provider/aliyun-ims/ims-compose.provider.ts apps/api/src/provider/aliyun-ims/ims-compose.provider.spec.ts
git commit -m "feat: support exact mixcut trim ranges"
```

### Task 5: Surface Speech Language And SSML Safely

**Files:**
- Modify: `apps/web/src/app/(dashboard)/mixcut/_store/use-mixcut-store.ts`
- Modify: `apps/web/src/app/(dashboard)/mixcut/_components/config-sections/audio-music-section.tsx`
- Modify: `apps/web/src/app/(dashboard)/mixcut/_components/subtitle-drawer/subtitle-content.tsx`
- Modify: `apps/web/src/app/(dashboard)/mixcut/_lib/build-mixcut-payload.ts`
- Modify: `apps/web/src/lib/api.ts`
- Modify: `apps/api/src/digital-human/dto/create-mixcut.dto.ts`
- Modify: `apps/api/src/digital-human/digital-human.service.ts`
- Modify: `apps/api/src/digital-human/digital-human.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Add tests that prove:
- speech language is forwarded into IMS editing config when selected
- SSML or rich speech markup is either forwarded or sanitized according to supported mode
- incompatible combinations are rejected early with actionable errors

- [ ] **Step 2: Run tests to verify they fail**

Run:
- `pnpm --filter @vsaas/api test -- src/digital-human/digital-human.service.spec.ts`

Expected: FAIL because the API DTO and service do not yet expose speech language or SSML controls.

- [ ] **Step 3: Write minimal implementation**

Expose speech language and SSML-capable text input in the UI, thread them through typed payload builders, and map them to existing provider support while preserving safe fallback for voices or modes that do not support them.

- [ ] **Step 4: Run tests to verify they pass**

Run:
- `pnpm --filter @vsaas/api test -- src/digital-human/digital-human.service.spec.ts`
- `pnpm --filter @vsaas/web build`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/(dashboard)/mixcut/_store/use-mixcut-store.ts apps/web/src/app/(dashboard)/mixcut/_components/config-sections/audio-music-section.tsx apps/web/src/app/(dashboard)/mixcut/_components/subtitle-drawer/subtitle-content.tsx apps/web/src/app/(dashboard)/mixcut/_lib/build-mixcut-payload.ts apps/web/src/lib/api.ts apps/api/src/digital-human/dto/create-mixcut.dto.ts apps/api/src/digital-human/digital-human.service.ts apps/api/src/digital-human/digital-human.service.spec.ts
git commit -m "feat: expose mixcut speech language and ssml"
```

### Task 6: Final Verification, Commit, And Deploy

**Files:**
- Verify: `apps/api`
- Verify: `apps/web`
- Verify: deployment scripts and existing release flow

- [ ] **Step 1: Run focused regression tests**

Run:
- `pnpm --filter @vsaas/api test`
- `pnpm --filter @vsaas/api build`
- `pnpm --filter @vsaas/web build`

Expected: all pass

- [ ] **Step 2: Review diff for only intended mixcut changes**

Run:
- `git status --short`
- `git diff -- apps/api/src/digital-human apps/api/src/provider/aliyun-ims apps/api/src/queue/processors/mixcut-production.processor.ts apps/web/src/app/(dashboard)/mixcut apps/web/src/lib/api.ts docs/superpowers/plans/2026-04-06-mixcut-remaining-capabilities.md`

Expected: only planned files or already-known related worktree changes remain.

- [ ] **Step 3: Commit the finished wave set**

```bash
git add apps/api/src/digital-human apps/api/src/provider/aliyun-ims apps/api/src/queue/processors/mixcut-production.processor.ts apps/web/src/app/(dashboard)/mixcut apps/web/src/lib/api.ts docs/superpowers/plans/2026-04-06-mixcut-remaining-capabilities.md
git commit -m "feat: complete remaining mixcut ims capabilities"
```

- [ ] **Step 4: Push and deploy using the existing production flow**

Run the repo’s established push and deploy commands after verification passes.

- [ ] **Step 5: Smoke-test production**

Verify:
- mixcut draft save and reopen still works
- preview-only returns usable preview data
- exact trim settings affect generated output
- global speech mode and group speech mode both submit successfully
- production site remains healthy at the current live domain

## Final Verification Matrix

Run these fresh after the last code change:

```powershell
pnpm --filter @vsaas/api test
pnpm --filter @vsaas/api build
pnpm --filter @vsaas/web build
```

Expected final state:

- explicit global speech mode exists in project state, payloads, and reload flows
- preview-only jobs persist real preview metadata
- trim ranges map to IMS exact clip metadata
- speech language or SSML controls are surfaced safely
- existing compatibility hardening and random pool behavior remain green

## Rollout Order

1. Land explicit global speech mode first because all later speech-related work depends on the editor state contract.
2. Land preview retrieval second so the UI can start consuming server-owned preview data.
3. Land exact trim support third because it changes the material model and provider mapping.
4. Land language or SSML last because it depends on the now-stable speech contract.
5. Run full verification before any commit or deploy claim.
