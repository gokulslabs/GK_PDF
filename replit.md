# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## PDF Reader App (`artifacts/mobile`)

Expo React Native PDF reader built on PDF.js (3.11.174) via WebView/iframe bridge.

### Features
- **PDF Rendering**: PDF.js inside iframe; postMessage bridge between RN and HTML
- **Zoom**: Re-renders pages at proper DPI; fit-to-width, fit-to-page, actual-size presets; pinch-to-zoom
- **Rotate**: 90° increments, recomputes base scale
- **View Mode**: Continuous scroll and single-page (CSS scroll-snap) toggle
- **Document Outline**: Extracts PDF bookmark tree via `pdfDoc.getOutline()`, sends to RN `OutlinePanel` component
- **Password Protection**: `onPassword` callback → `PASSWORD_REQUIRED` message → native dialog or in-page dialog
- **AcroForm Filling**: `page.getAnnotations()` → HTML input/textarea/select overlays positioned using viewport transforms
- **Annotations**:
  - Freehand draw + eraser
  - Text-snapped highlight/underline/strikethrough (bbox match against text index)
  - Text box (click to type, renders to canvas)
  - Stamps: Approved, Draft, Confidential, Reviewed, Urgent
  - Shapes: line, rect, oval, arrow
  - Sticky notes (long-press to place)
- **Search**: Full-text search with highlighted results, page nav
- **Thumbnails**: Paginated thumbnail strip
- **Dark Mode**: Canvas `filter: invert(1) hue-rotate(180deg)`

### Key Files
- `constants/pdfHtml.ts` — full HTML/JS PDF engine (zoom, snap, forms, stamps, outline, password)
- `components/PDFViewer.tsx` — RN wrapper, postMessage bridge, ref API
- `components/AnnotationToolbar.tsx` — tool/color/shape/stamp picker
- `components/OutlinePanel.tsx` — slide-out bookmark tree panel
- `app/viewer/[id].tsx` — viewer screen with all controls wired up
- `types/pdf.ts` — AnnotationTool, ShapeType, StampType, ViewMode, OutlineItem
