# AGENTS.md - Zaping

## Project Overview

Next.js 16 application using the App Router, React 19, TypeScript, Tailwind CSS v4,
and shadcn/ui v4 (radix-mira style). Single-package project (not a monorepo).
Package manager is **pnpm**. Module system is ESM (`"type": "module"`).

## Build / Lint / Test Commands

```bash
pnpm dev          # Start dev server (Turbopack)
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # Run ESLint (flat config, Next.js core-web-vitals + TS rules)
pnpm format       # Prettier: format all .ts/.tsx files
pnpm typecheck    # TypeScript type-check (tsc --noEmit)
```

No test framework is configured yet. When one is added (Vitest recommended):

```bash
# pnpm test                            # Run all tests
# pnpm test -- path/to/file.test.ts    # Run a single test file
```

Adding shadcn/ui components (installed into `components/ui/` as owned source):

```bash
pnpm dlx shadcn@latest add <component-name>
```

## Project Structure

```
app/              # Next.js App Router (pages, layouts, global CSS)
components/       # Shared React components
components/ui/    # shadcn/ui primitive components (owned, not imported from lib)
hooks/            # Custom React hooks
lib/              # Utilities and helpers (cn(), etc.)
public/           # Static assets
```

Path alias: `@/*` maps to the project root (configured in tsconfig.json).

## Code Style

**Prettier** (`.prettierrc`): **No semicolons**, **double quotes**, 2-space indent,
80-char print width, trailing commas (ES5), LF line endings. Tailwind class sorting
via `prettier-plugin-tailwindcss` (aware of `cn()` and `cva()`). Run `pnpm format`.

**ESLint 9** (`eslint.config.mjs`): Extends `eslint-config-next/core-web-vitals`
and `eslint-config-next/typescript`. Ignores `.next/`, `out/`, `build/`.

**TypeScript**: Strict mode, Target ES2017, Module ESNext, bundler resolution,
incremental compilation, no emit (`noEmit: true`).

## Naming Conventions

| Entity              | Convention | Example                          |
| ------------------- | ---------- | -------------------------------- |
| Component files     | kebab-case | `theme-provider.tsx`             |
| Components          | PascalCase | `ThemeProvider`, `Button`        |
| Utility functions   | camelCase  | `cn()`, `isTypingTarget()`       |
| Constants/variables | camelCase  | `buttonVariants`, `geistHeading` |
| CSS variables       | kebab-case | `--font-sans`, `--color-primary` |
| Hook files          | kebab-case | `use-mobile.ts`                  |
| Hook functions      | camelCase  | `useMobile()`                    |

## Import Conventions

1. External/library imports first, then a blank line, then local/project imports.
2. Use the `@/` path alias for all project-internal imports (never relative `../`).
3. Prefer **named imports**: `import { Button } from "@/components/ui/button"`
4. Use `import * as React from "react"` (namespace import) in component files.
5. Type-only imports when importing only types: `import { type VariantProps } from "..."`
   or inline: `import { cva, type VariantProps } from "class-variance-authority"`

```typescript
// External
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

// Internal
import { cn } from "@/lib/utils"
```

## Component Patterns

### Function declarations, not arrow functions

```typescript
function Button({ className, variant, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant }), className)} {...props} />
}
```

### Named exports for reusable components

```typescript
export { Button, buttonVariants }
```

### Default exports only for route components (pages/layouts)

```typescript
export default function Page() { ... }
```

### Client components

Mark with `"use client"` as the very first line. Server Components are the default --
only add `"use client"` when the component needs browser APIs, hooks, or event handlers.

### Props typing

- Extend HTML element props with `React.ComponentProps<"element">`.
- Compose with intersection types, not interfaces:
  `React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }`
- For layout props: `Readonly<{ children: React.ReactNode }>`.
- Inline types preferred over separate named interfaces for component props.

### Variant-based styling

Use `class-variance-authority` (CVA) for component variants. Always apply classes
through the `cn()` utility (`lib/utils.ts`) which merges via `clsx` + `tailwind-merge`.
Use `data-slot` attributes on components for styling hooks:
`<Comp data-slot="button" data-variant={variant} />`

## Styling

- **Tailwind CSS v4** with PostCSS (`@tailwindcss/postcss` plugin).
- Design tokens as CSS custom properties in `app/globals.css` using `oklch` color space.
- Theme switching via `next-themes` (class strategy, `.dark` on `<html>`).
- Three font families: `--font-heading` (Geist), `--font-sans` (Inter), `--font-mono` (Geist Mono).
- Use the `cn()` helper for all conditional/merged class names.

## Error Handling

- Use early returns with guard clauses instead of deeply nested conditionals.
- Check `instanceof` before narrowing DOM types.
- Prefer explicit type narrowing over type assertions.

## Key Dependencies

`next` 16.x (App Router framework), `react` 19.x, `radix-ui` (accessible UI primitives),
`class-variance-authority` (CVA variants), `tailwind-merge` + `clsx` (class merging),
`next-themes` (dark/light toggle), `lucide-react` (icons), `shadcn` (component CLI).

## Things to Avoid

- Do not use default exports for reusable components (only pages/layouts).
- Do not use arrow functions for component definitions.
- Do not use semicolons (enforced by Prettier).
- Do not use single quotes (enforced by Prettier).
- Do not use relative imports (`../`) when `@/` alias is available.
- Do not add `"use client"` unless the component genuinely needs client-side features.
- Do not manually sort Tailwind classes -- `prettier-plugin-tailwindcss` handles it.
- Do not install shadcn components via npm -- use `pnpm dlx shadcn@latest add`.
