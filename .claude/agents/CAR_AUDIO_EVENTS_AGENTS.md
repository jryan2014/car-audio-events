# Car Audio Events Agent System

## Overview
This document describes the specialized AI agents available for the Car Audio Events platform. These agents provide domain-specific expertise to accelerate development and maintain consistency across the platform.

## Platform-Specific Agents

### 1. Support Desk Specialist
- **Trigger**: Working on support desk features
- **Expertise**: Ticket management, customer service workflows, support analytics
- **Location**: `.claude/agents/car-audio-events/support-desk-specialist.md`

### 2. Event Platform Architect
- **Trigger**: Event management, competitions, registrations
- **Expertise**: Event systems, scoring, real-time updates
- **Location**: `.claude/agents/car-audio-events/event-platform-architect.md`

### 3. Payment Integration Specialist
- **Trigger**: Payment processing, subscriptions, financial features
- **Expertise**: Stripe/PayPal, security, compliance
- **Location**: `.claude/agents/car-audio-events/payment-integration-specialist.md`

## General Purpose Agents (from Contains Studio)

### Engineering
- **rapid-prototyper**: Quick feature implementation
- **backend-architect**: API and database design
- **frontend-developer**: UI/UX implementation
- **devops-automator**: CI/CD and infrastructure
- **test-writer-fixer**: Testing and quality assurance

### Product & Design
- **product-strategist**: Feature planning and roadmap
- **ux-designer**: User experience optimization
- **design-systems-expert**: Component library management

### Operations
- **project-manager**: Sprint planning and coordination
- **documentation-writer**: Technical documentation
- **performance-optimizer**: Speed and efficiency

## Usage Examples

### Automatic Activation
```bash
# Working on support features automatically activates Support Desk Specialist
cd src/modules/support-desk/
# The agent will provide context-aware assistance

# Working on payments activates Payment Integration Specialist
cd supabase/functions/create-payment-intent/
# Security and compliance guidance provided automatically
```

### Explicit Activation
```bash
# Request specific agent
"I need the event platform architect to help design a new tournament bracket system"

# Combine multiple agents
"Get the payment specialist and support desk specialist to design the refund workflow"
```

## Custom Agent Creation

To create new agents for Car Audio Events:

1. Create a new `.md` file in `.claude/agents/car-audio-events/`
2. Follow the template structure:
   - Identity
   - Capabilities
   - Context Triggers
   - Approach
   - Key Responsibilities
   - Integration Points
   - Best Practices

3. Test the agent by working in relevant code areas

## Best Practices

1. **Let agents auto-activate** based on context
2. **Combine agents** for cross-functional features
3. **Update agents** as the platform evolves
4. **Document agent decisions** in code comments
5. **Share agent knowledge** with the team

## Maintenance

- Review agents quarterly
- Update triggers based on new features
- Add new agents as platform grows
- Remove outdated agents
- Keep agent knowledge current