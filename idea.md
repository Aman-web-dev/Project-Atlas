# AGENT.md

# Project Name

Project Atlas (working title)

## Vision

Build an AI-powered advertising platform that allows businesses to:

- Create advertisements using AI.
- Design creatives using a Canva-like editor.
- Publish advertisements across multiple platforms.
- Monitor analytics from a single dashboard.
- Allow autonomous agents to optimize campaigns continuously.

Long-term goal:

"One interface for the entire advertising ecosystem."

---

# Core Principle

Never build features before validating demand.

Order of development:

1. AI ad generation
2. Creative editor
3. Asset management
4. Campaign management
5. Platform integrations
6. Analytics
7. Autonomous optimization

---

# User Personas

### Individual creators

- Influencers
- Content creators
- Freelancers

### Small businesses

- Restaurants
- Local stores
- Agencies

### Enterprises

- Large brands
- Marketing agencies
- SaaS companies

---

# Phase 1 (MVP)

## Features

### AI copy generation

Input:

- Product name
- Product description
- Target audience
- Budget
- Platform

Output:

- Headlines
- Descriptions
- Calls to action

---

### AI image generation

Input:

- Uploaded image
- Brand colors
- Logo
- Prompt

Output:

- Generated advertisements
- Multiple aspect ratios

Supported formats:

- 1:1
- 4:5
- 16:9
- 9:16

---

### Brand kit

Store:

- Logos
- Fonts
- Colors
- Product images

---

### Asset library

Store:

- Images
- Videos
- Generated creatives
- Templates

---

# Phase 2

## Visual editor

Features:

- Drag and drop components
- Layers
- Alignment guides
- Text editing
- Background removal
- Filters
- Animation support

---

# Phase 3

## Social publishing

Supported platforms:

- Facebook
- Instagram
- Threads
- LinkedIn
- TikTok
- Pinterest
- X

---

# Phase 4

## Advertising integrations

### Meta ecosystem

- Facebook Ads
- Instagram Ads
- WhatsApp Ads

### Google ecosystem

- Google Ads
- YouTube Ads
- Display Ads

### Other platforms

- TikTok Ads
- LinkedIn Ads
- Pinterest Ads
- Snapchat Ads

---

# Phase 5

## Analytics engine

Track:

- Impressions
- Clicks
- CTR
- CPC
- CPM
- Conversions
- Revenue
- ROI

---

# Phase 6

## Autonomous agents

---

### Agent: Creative Director

Responsibilities:

- Analyze previous campaigns.
- Create image variations.
- Create headlines.
- Create CTAs.
- Generate A/B tests.

---

### Agent: Media Buyer

Responsibilities:

- Allocate budgets.
- Pause poor campaigns.
- Increase winning budgets.
- Suggest audiences.

---

### Agent: Analytics Agent

Responsibilities:

- Analyze metrics.
- Detect anomalies.
- Create reports.
- Generate recommendations.

---

### Agent: Audience Agent

Responsibilities:

- Segment audiences.
- Build lookalike audiences.
- Detect trends.

---

### Agent: Compliance Agent

Responsibilities:

- Detect policy violations.
- Detect prohibited content.
- Flag risky advertisements.

---

# Proposed architecture

```text
Frontend (Next.js)

│

├── Landing pages
├── Dashboard
├── Editor
└── Analytics

│

Backend (Node.js)

│

├── Authentication
├── Billing
├── User management
├── Asset management
├── Agent orchestration
└── Campaign management

│

Database Layer

│

├── PostgreSQL
├── Redis
├── Vector database
└── Object storage

│

AI Layer

│

├── GPT
├── Gemini
├── Claude
└── Open-source models

│

Integrations

│

├── Meta API
├── Google Ads API
├── LinkedIn API
├── TikTok API
├── X API
└── Pinterest API
```

---

# Recommended stack

### Frontend

- Next.js
- Tailwind
- Shadcn
- React Query

### Backend

- Node.js
- Fastify
- TypeScript

### Database

- PostgreSQL
- Redis

### Infrastructure

- Docker
- Kubernetes
- Cloudflare

### Messaging

- BullMQ
- Kafka

### Authentication

- Clerk
- Auth.js

### AI

- OpenAI
- Gemini
- Anthropic

---

# Rules for all agents

1. Be cost-conscious.
2. Never expose credentials.
3. Log every action.
4. Avoid duplicate work.
5. Retry failed operations.
6. Respect rate limits.
7. Request human approval for destructive actions.
8. Maintain complete audit logs.

---

# Success metric

The user should be able to:

- Upload assets.
- Generate advertisements.
- Publish advertisements.
- View analytics.
- Optimize campaigns.

...without leaving the platform.
