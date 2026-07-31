# theme.md

## Purpose

This document defines the visual language, design rules, component standards, and development constraints for the Project Atlas frontend.

Every AI agent, developer, or contributor must follow these rules.

---

# Core philosophy

Project Atlas is:

- Modern
- Professional
- Fast
- Minimal
- Data-heavy
- AI-first
- Enterprise-ready

The interface should feel like a combination of:

- Linear
- Stripe
- Notion
- Figma
- Canva
- Vercel
- Raycast

The interface must never feel like:

- WordPress
- Bootstrap
- Traditional admin dashboards
- Government portals

---

# Approved stack

## Framework

- Next.js
- React
- TypeScript

---

## Styling

- Tailwind CSS

---

## Components

Primary component system:

- shadcn/ui

Allowed supporting libraries:

- Radix UI
- Lucide React
- cmdk
- sonner

No additional component libraries are permitted.

---

## State management

- Zustand
- React Context

Do not introduce Redux.

---

## Forms

- React Hook Form
- Zod

---

## Tables

- TanStack Table

---

## Charts

- Recharts

---

## Drag and drop

- dnd-kit

---

## Canvas editor

- Fabric.js

---

## Rich text editing

- Tiptap

---

## Animations

- Motion

---

## Data fetching

- TanStack Query

---

## Icons

- Lucide React

---

# Forbidden libraries

Do not introduce:

- Material UI
- Chakra UI
- Ant Design
- Bootstrap
- Semantic UI
- Bulma
- jQuery

These libraries create visual inconsistencies.

---

# Layout principles

Always prioritize:

1. Readability
2. Speed
3. Simplicity
4. Accessibility
5. Scalability

---

# Design rules

## Border radius

Small:

```css
rounded-md
```

Medium:

```css
rounded-lg
```

Large:

```css
rounded-xl
```

Avoid:

```css
rounded-full
```

---

## Shadows

Allowed:

```css
shadow-sm
shadow-md
```

Avoid large shadows.

---

## Blur

Allowed:

```css
backdrop-blur-sm
backdrop-blur-md
```

Avoid excessive glassmorphism.

---

## Spacing

Preferred spacing scale:

```text
4
8
12
16
20
24
32
48
64
```

---

## Typography

Headings:

```css
font-semibold
font-bold
```

Body text:

```css
font-normal
```

Avoid extremely thin fonts.

---

# Color system

## Background

```css
zinc-950
```

---

## Secondary background

```css
zinc-900
```

---

## Card background

```css
zinc-800
```

---

## Border

```css
zinc-700
```

---

## Primary text

```css
zinc-100
```

---

## Secondary text

```css
zinc-400
```

---

## Success

```css
emerald-500
```

---

## Warning

```css
amber-500
```

---

## Error

```css
red-500
```

---

## Information

```css
blue-500
```

---

# Component rules

Every component must:

- Support dark mode.
- Support keyboard navigation.
- Support accessibility standards.
- Support responsive layouts.
- Be reusable.
- Be typed with TypeScript.

---

# File structure

```text
components/
├── ui/
├── editor/
├── campaigns/
├── analytics/
├── agents/
├── assets/
├── forms/
└── layouts/
```

---

# AI rules

The AI agent MUST:

- Reuse existing components.
- Avoid creating duplicate components.
- Avoid introducing additional UI frameworks.
- Avoid unnecessary dependencies.
- Keep bundle size small.
- Prefer composition over inheritance.
- Follow existing naming conventions.
- Preserve design consistency.

---

# Decision hierarchy

When multiple solutions exist:

1. Existing codebase
2. Existing component
3. Existing utility
4. Existing library
5. New implementation

---

# Golden rule

If a feature can be built with the existing stack, do not add a new package.