# Car Audio Events Agents - Quick Start Guide

## 🚀 Quick Reference

**Main Documentation**: `.claude/agents/CAR_AUDIO_EVENTS_AGENTS.md`
**Agent Directory**: `.claude/agents/`
**Project Config**: `CLAUDE.md` (mentions agent system)

## 🎯 How to Call Agents

### 1. Automatic Activation (Recommended)
Agents activate automatically based on what you're working on:

```bash
# Navigate to a module and the relevant agent activates
cd src/modules/support-desk/
# Support Desk Specialist is now active

cd supabase/functions/create-payment-intent/
# Payment Integration Specialist is now active
```

### 2. Explicit Agent Request
Ask for specific agents by name:

```
"I need the rapid-prototyper agent to help me build a new dashboard"
"Get the backend-architect to review our API structure"
"I want the support desk specialist to optimize our ticket routing"
```

### 3. Multi-Agent Collaboration
Combine agents for complex features:

```
"I need the payment integration specialist and support desk specialist to work together on designing the refund workflow"

"Get the event platform architect, frontend developer, and backend architect to collaborate on building a real-time scoring system"
```

## 🏗️ Building Features with Agents

### Example 1: Building a New Event Registration System

```
"I want to build a new event registration system. Please use:
- Event Platform Architect for the overall design
- Payment Integration Specialist for payment processing
- Frontend Developer for the UI
- Backend Architect for the API design

The system should support:
1. Multi-tier pricing (early bird, regular, VIP)
2. Team registrations
3. Payment via Stripe and PayPal
4. QR code tickets
5. Automatic confirmation emails"
```

### Example 2: Creating a Sponsor Dashboard

```
"Let's build a sponsor dashboard using multiple agents:
- Product Strategist to define requirements
- UX Designer for the interface design  
- Frontend Developer for React components
- Backend Architect for API endpoints
- Test Writer for comprehensive testing

Features needed:
- Event visibility metrics
- Lead generation tracking
- Custom branding options
- Analytics export"
```

### Example 3: Implementing Support Automation

```
"I need the following agents to collaborate on support automation:
- Support Desk Specialist (lead) for workflow design
- AI Engineer for intelligent routing
- Backend Architect for queue system
- DevOps Automator for scheduled jobs

Requirements:
- Auto-categorize tickets
- Smart assignment to agents
- SLA tracking
- Escalation workflows"
```

## 📋 Agent Capabilities Reference

### Platform-Specific Agents
| Agent | Trigger Keywords | Best For |
|-------|-----------------|----------|
| Support Desk Specialist | support, ticket, help, customer service | Support features, workflows |
| Event Platform Architect | event, competition, tournament, registration | Event management systems |
| Payment Integration Specialist | payment, stripe, paypal, subscription | Payment features, security |

### Engineering Agents
| Agent | Trigger Keywords | Best For |
|-------|-----------------|----------|
| rapid-prototyper | quickly, prototype, MVP, demo | Fast feature development |
| backend-architect | API, database, architecture, scalability | System design, APIs |
| frontend-developer | UI, React, component, interface | User interfaces |
| devops-automator | deploy, CI/CD, Docker, automation | Infrastructure, deployment |
| test-writer-fixer | test, spec, TDD, coverage | Testing, quality assurance |

### Product & Design Agents
| Agent | Trigger Keywords | Best For |
|-------|-----------------|----------|
| product-strategist | feature, roadmap, user story, requirements | Product planning |
| ux-designer | UX, usability, wireframe, user flow | User experience design |
| design-systems-expert | components, design system, style guide | UI consistency |

## 🎮 Pro Tips

### 1. Start with High-Level Planning
```
"Get the product strategist and event platform architect to outline the requirements for a new judging system"
```

### 2. Move to Technical Design
```
"Now have the backend architect and database expert design the schema and API"
```

### 3. Implementation Phase
```
"Use the rapid-prototyper and frontend developer to build the judge interface"
```

### 4. Testing & Deployment
```
"Get the test-writer and devops-automator to ensure quality and deploy"
```

## 🔄 Workflow Example: Complete Feature

```
"I want to build a complete sponsor management system. Please coordinate these agents:

Phase 1 - Planning (product-strategist, event platform architect):
- Define sponsor tiers and benefits
- Plan dashboard features
- Create user stories

Phase 2 - Design (ux-designer, design-systems-expert):
- Design sponsor dashboard UI
- Create admin management interface
- Define component library updates

Phase 3 - Backend (backend-architect, database expert):
- Design database schema
- Create API endpoints
- Implement business logic

Phase 4 - Frontend (frontend-developer, rapid-prototyper):
- Build React components
- Implement responsive design
- Add real-time updates

Phase 5 - Integration (payment specialist, devops-automator):
- Add payment processing
- Set up automated deployments
- Configure monitoring

Phase 6 - Testing (test-writer-fixer, performance-optimizer):
- Write comprehensive tests
- Optimize performance
- Fix any issues"
```

## 💡 Quick Commands

```bash
# List all available agents
ls .claude/agents/

# View specific agent details
cat .claude/agents/engineering/backend-architect.md

# See Car Audio Events specific agents
ls .claude/agents/car-audio-events/
```

## 🚨 Remember

1. Agents work best when given clear context
2. Multiple agents can collaborate on complex features
3. Be specific about requirements and constraints
4. Agents maintain consistency with existing code patterns
5. Always review agent suggestions before implementing

---

Ready to build with agents? Just describe what you want to create!