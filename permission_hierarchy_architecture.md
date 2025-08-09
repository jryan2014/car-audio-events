# Permission Hierarchy Architecture

## Permission Resolution Flow

```mermaid
flowchart TD
    A[User Requests Feature Access] --> B{User Logged In?}
    B -->|No| C[Check Public Tier Permissions]
    B -->|Yes| D[Get User Details]
    
    D --> E{Has Direct User<br/>Tier Assignment?}
    E -->|Yes| F[Use Direct Assignment<br/>Highest Priority]
    E -->|No| G{User in Organization?}
    
    G -->|Yes| H{Organization Has<br/>Feature Tier?}
    H -->|Yes| I[Use Organization Tier<br/>Medium Priority]
    H -->|No| J[Use Membership Plan Default<br/>Lowest Priority]
    
    G -->|No| J
    
    F --> K{Organization Employee<br/>Restrictions?}
    I --> K
    J --> K
    
    K -->|Yes| L[Apply Employee Restrictions]
    K -->|No| M[Check Sub-Feature Permissions]
    
    L --> N{Restriction Allows<br/>Action?}
    N -->|No| O[DENY - Employee Restricted]
    N -->|Yes| M
    
    M --> P{Sub-Feature<br/>Required?}
    P -->|Yes| Q{Sub-Feature<br/>Permission Exists?}
    Q -->|No| R[DENY - Sub-Feature Not Allowed]
    Q -->|Yes| S[Check Usage Limits]
    
    P -->|No| S
    
    S --> T{Usage Limits<br/>Apply?}
    T -->|Yes| U{Under Limit?}
    U -->|No| V[DENY - Usage Limit Exceeded]
    U -->|Yes| W[GRANT ACCESS]
    
    T -->|No| W
    C --> X{Public Access<br/>Allowed?}
    X -->|Yes| S
    X -->|No| Y[DENY - Feature Not Public]
    
    W --> Z[Log Feature Usage]
    
    style F fill:#e1f5fe
    style I fill:#fff3e0
    style J fill:#fce4ec
    style O fill:#ffebee
    style R fill:#ffebee
    style V fill:#ffebee
    style Y fill:#ffebee
    style W fill:#e8f5e8
```

## User Type Hierarchy

```mermaid
graph TD
    A[Platform Users] --> B[Unauthenticated]
    A --> C[Authenticated Users]
    
    B --> D[Public<br/>Limited Access<br/>5 calculations/day]
    
    C --> E[Individual Members]
    C --> F[Organization Members]
    C --> G[Platform Staff]
    
    E --> H[Free Competitor<br/>50 calculations/day<br/>Basic features]
    E --> I[Pro Competitor<br/>Unlimited usage<br/>Advanced features]
    
    F --> J[Organization Employees]
    F --> K[Organization Admins]
    
    J --> L[Employee<br/>Inherited permissions<br/>+ Restrictions]
    J --> M[Manager<br/>Department oversight<br/>+ Team management]
    J --> N[Support Rep<br/>Answer tickets<br/>Read-only customer data]
    J --> O[Read Only<br/>View access only<br/>No modifications]
    
    K --> P[Organization Admin<br/>Full organization control<br/>Seat management<br/>Employee permissions]
    
    G --> Q[Support Representative<br/>Support desk only<br/>Read customer data]
    G --> R[Moderator<br/>Content moderation<br/>Future forums]
    G --> S[Sub-Admin<br/>Limited admin access<br/>No settings/billing]
    G --> T[Super Admin<br/>Full platform access<br/>All features/settings]
    
    style D fill:#ffcdd2
    style H fill:#e8f5e8
    style I fill:#c8e6c9
    style L fill:#fff3e0
    style M fill:#fff3e0
    style N fill:#fff3e0
    style O fill:#fff3e0
    style P fill:#ffeb3b
    style Q fill:#e1f5fe
    style R fill:#e1f5fe
    style S fill:#e1f5fe
    style T fill:#ff9800
```

## Organization Seat Management

```mermaid
flowchart TD
    A[Organization Subscription] --> B[Seat Allocation]
    B --> C[5 Seats Included<br/>Upsell for More]
    
    C --> D{Seats Available?}
    D -->|Yes| E[Invite Employee]
    D -->|No| F[Upgrade Plan<br/>or Remove Employee]
    
    E --> G[Employee Role Assignment]
    G --> H[Admin - Full Org Control]
    G --> I[Manager - Department Oversight]  
    G --> J[Employee - Inherited Permissions]
    G --> K[Support Rep - Ticket Access]
    G --> L[Read Only - View Access]
    
    H --> M[Can Manage All Employees<br/>Set Restrictions<br/>Assign Roles]
    I --> N[Can Manage Department<br/>Limited Employee Access]
    J --> O[Organization Tier Permissions<br/>Minus Admin-Set Restrictions]
    K --> P[Answer Organization Tickets<br/>Read Customer Data]
    L --> Q[View Only Access<br/>No Modifications]
    
    M --> R[Employee Restrictions<br/>Per Feature]
    R --> S[Allowed Actions:<br/>view, create, edit, delete]
    R --> T[Usage Limits:<br/>Custom per employee]
    R --> U[Department Filter:<br/>HR, Sales, Support]
    
    style A fill:#e3f2fd
    style C fill:#fff3e0
    style F fill:#ffcdd2
    style H fill:#ffeb3b
    style I fill:#fff3e0
    style J fill:#e8f5e8
    style K fill:#e1f5fe
    style L fill:#f3e5f5
```

## Support Desk Routing Logic

```mermaid
flowchart TD
    A[Support Ticket Created] --> B[Get Request Type]
    B --> C{Request Type<br/>Routing Rule?}
    
    C -->|Organization| D[Must Route to Organization]
    C -->|Hybrid| E[Smart Context Routing]
    C -->|Internal| F[Route to Platform Support]
    
    D --> G{User Selected<br/>Organization?}
    G -->|Yes| H[Route to Selected Org]
    G -->|No| I{Event Has<br/>Organization?}
    I -->|Yes| J{Org Has Support<br/>Provisioned?}
    I -->|No| K{User Has<br/>Organization?}
    
    J -->|Yes| L[Route to Event Organization]
    J -->|No| F
    
    K -->|Yes| M{User Org Has<br/>Support?}
    K -->|No| F
    
    M -->|Yes| N[Route to User Organization]
    M -->|No| F
    
    E --> O{User Selected<br/>Organization?}
    O -->|Yes| H
    O -->|No| P{Event Context<br/>Available?}
    
    P -->|Yes| I
    P -->|No| K
    
    H --> Q[Organization Queue]
    L --> Q
    N --> Q
    F --> R[Internal Platform Queue]
    
    Q --> S[Organization Support Team]
    R --> T[Platform Support Staff]
    
    S --> U{Auto-Assignment<br/>Enabled?}
    U -->|Yes| V[Assign to Available Rep]
    U -->|No| W[Queue for Manual Assignment]
    
    T --> X[Platform Support Assignment]
    
    style Q fill:#fff3e0
    style R fill:#e1f5fe
    style S fill:#ffeb3b
    style T fill:#ff9800
```

## Dynamic Feature Detection

```mermaid
flowchart TD
    A[Feature Detection Sources] --> B[Code Scanning]
    A --> C[Runtime Discovery]
    A --> D[API Endpoint Detection]
    
    B --> E[Static Analysis<br/>Component Detection<br/>Route Scanning]
    C --> F[Function Calls<br/>Permission Checks<br/>Usage Patterns]
    D --> G[API Documentation<br/>Endpoint Registration<br/>OpenAPI Spec]
    
    E --> H[Feature Detection Queue]
    F --> H
    G --> H
    
    H --> I[Processing Engine]
    I --> J{Feature Exists?}
    
    J -->|No| K[Create New Feature]
    J -->|Yes| L[Update Feature Metadata]
    
    K --> M[Auto-Assign Basic Permissions]
    L --> N[Update Detection Timestamp]
    
    M --> O[Admin Review Required]
    N --> O
    
    O --> P{Admin Approval?}
    P -->|Yes| Q[Feature Active]
    P -->|No| R[Feature Inactive]
    
    Q --> S[Available in Admin UI<br/>Permission Assignment<br/>Tier Configuration]
    
    style H fill:#fff3e0
    style K fill:#e8f5e8
    style O fill:#ffeb3b
    style Q fill:#c8e6c9
    style R fill:#ffcdd2
```

## Permission Priority System

1. **HIGHEST PRIORITY**: Direct User Tier Assignment
   - Explicitly assigned by admin
   - Overrides all other permissions
   - Can have expiration date

2. **MEDIUM PRIORITY**: Organization Tier Assignment
   - Set at organization level
   - Applies to all organization members
   - Affected by employee restrictions

3. **LOWEST PRIORITY**: Membership Plan Default
   - Based on user's membership type
   - Default fallback permissions
   - Standard tier assignments

## Employee Restriction Matrix

| Employee Role | Feature Access | Can Create | Can Modify | Admin Functions | Support Access |
|---------------|----------------|------------|------------|-----------------|----------------|
| **Admin** | Full Org Tier | Yes | Yes | Full | Organization Queue |
| **Manager** | Full Org Tier | Yes | Dept Only | Limited | Department Tickets |
| **Employee** | Restricted | Limited | Own Only | None | Create Tickets |
| **Support Rep** | Support Only | Tickets | Ticket Replies | None | Organization Queue |
| **Read Only** | View Only | No | No | None | View Tickets |

## Seat-Based Licensing

- **5 Seats Included** in base organization plans
- **Automatic Usage Tracking** via database triggers
- **Upsell Opportunities** when seats are full
- **Role-Based Seat Value** (Admin = 2 seats, Employee = 1 seat)
- **Seat Reclamation** when employees are deactivated