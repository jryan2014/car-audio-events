# 🎭 Agent Orchestration Guide

## Master Project Manager Pattern

### Basic Usage

Instead of managing multiple agents yourself, just tell the Master Project Manager what you want:

```
"Master Project Manager: Build a complete sponsor management system for events"
```

The Project Manager will then:
1. Break down the project into phases
2. Assign specialized agents to each phase
3. Coordinate their work in the correct order
4. Report progress back to you

### Example Commands

#### Simple Feature Request
```
"Project Manager: Create a competitor check-in system"
```

#### Complex System
```
"Master Project Manager: Build a complete event scoring and judging platform with:
- Real-time score updates
- Multiple judge support  
- Live leaderboards
- Historical analytics"
```

#### Integration Project
```
"Project Manager: Integrate Instagram social media feeds into our event pages"
```

### How It Works

1. **You** → Tell Project Manager what to build
2. **Project Manager** → Creates project plan with phases
3. **Project Manager** → Activates specialist agents for each phase:
   - Phase 1: `@product-strategist` + `@architect`
   - Phase 2: `@backend-architect` + `@database-expert`  
   - Phase 3: `@rapid-prototyper` + `@frontend-developer`
   - Phase 4: `@test-writer` + `@performance-optimizer`
   - Phase 5: `@devops-automator` + `@documentation-writer`
4. **Specialist Agents** → Do their specific work
5. **Project Manager** → Coordinates and reports progress

### Advanced Usage

#### With Constraints
```
"Project Manager: Build a ticketing system that must:
- Support 10,000 concurrent users
- Process payments in under 2 seconds
- Work offline for events
- Cost less than $500/month to operate"
```

#### With Specific Team
```
"Project Manager: Create a mobile app using only:
- mobile-app-builder
- backend-architect  
- test-writer-fixer
Timeline: 2 weeks"
```

#### Phased Delivery
```
"Project Manager: Build an event platform in 3 phases:
Phase 1: Basic event creation (1 week)
Phase 2: Registration and payments (1 week)  
Phase 3: Live scoring and results (1 week)"
```

## Orchestration Patterns

### 1. Waterfall Pattern (Sequential)
```
"Project Manager: Build feature X using waterfall approach"
→ Requirements → Design → Implementation → Testing → Deployment
```

### 2. Agile Pattern (Iterative)
```
"Project Manager: Build feature Y using 1-week sprints"
→ Sprint 1: MVP → Sprint 2: Enhanced → Sprint 3: Polish
```

### 3. Parallel Pattern (Multiple Teams)
```
"Project Manager: Build features A, B, and C in parallel"
→ Team 1: Feature A
→ Team 2: Feature B  
→ Team 3: Feature C
→ Integration Phase
```

## Quick Templates

### New Feature
```
"Master Project Manager: Add [FEATURE NAME] to the platform"
```

### System Redesign
```
"Project Manager: Redesign [SYSTEM NAME] for better performance"
```

### Integration
```
"Project Manager: Integrate [EXTERNAL SERVICE] into our platform"
```

### Migration
```
"Project Manager: Migrate [OLD SYSTEM] to [NEW SYSTEM]"
```

## Benefits

1. **Single Point of Contact**: Just talk to the Project Manager
2. **Automatic Coordination**: Agents work in correct sequence
3. **No Micromanagement**: You don't manage individual agents
4. **Progress Tracking**: Project Manager reports status
5. **Best Practices**: Ensures all phases are covered

## Example: Full Project

```
You: "Master Project Manager: Build a complete judge management system for car audio competitions"

Project Manager: "I'll coordinate the team to build a judge management system. Here's my plan:

**Phase 1 - Requirements (2 days)**
- @product-strategist: Define judge roles and permissions
- @event-platform-architect: Design competition workflow
- @ux-designer: Create judge interface wireframes

**Phase 2 - Technical Design (2 days)**
- @backend-architect: Design judge API and scoring algorithms
- @database-expert: Design schema for judges, scores, categories
- @security-expert: Design authentication and audit trails

**Phase 3 - Implementation (4 days)**
- @rapid-prototyper: Build judge dashboard
- @frontend-developer: Create scoring interface
- @mobile-app-builder: Build mobile judging app
- @real-time-expert: Implement live score updates

**Phase 4 - Testing (2 days)**
- @test-writer-fixer: Write judge workflow tests
- @performance-optimizer: Ensure fast score calculations
- @security-auditor: Verify score tampering prevention

**Phase 5 - Deployment (1 day)**
- @devops-automator: Deploy judge system
- @documentation-writer: Create judge training materials
- @support-desk-specialist: Prepare support guides

Starting Phase 1 now..."

[Project Manager then activates each agent in sequence]
```

---

**Remember**: The Master Project Manager is your orchestrator. Just describe what you want built, and let the PM handle the rest!