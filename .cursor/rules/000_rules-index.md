# MDC Rules Index

This file serves as the master index of all MDC (Module Definition and Configuration) rules in the project.
For information about the rules system and how to manage it, see `.cursor/docs/rules-framework.md`.

## Project Context

<insert detailed project description here>

## Core Framework Rules (000-019)

### @001_workspace.mdc

```yaml
---
description: Defines the relationship between development scaffolding (.cursor/) and project workspace, establishing clear boundaries and interaction patterns.
globs: src/**/*, backend/**/*
---
## Workspace Philosophy

1. Separation of Concerns
- Project space: Core functionality and implementation
- .cursor/: Development guidance and support only
- Clear boundaries between scaffolding and project

2. Scaffolding Principles
- Non-invasive: Support without interference
- Discoverable: Clear organization of development resources
- Portable: Scaffolding independent of project specifics
- Extensible: Framework for project-specific rules
```

### @002_cursor_rules.mdc

```yaml
---
description: Standards for MDC rules as development scaffolding, defining how rules support and guide project development without constraining it.
globs: .cursor/rules/**/*.mdc
---
## Rule Framework

1. Core Purpose
- Provide development guidance
- Document conventions and patterns
- Support tool configuration
- Enable project-specific extensions

2. Rule Categories
- See `.cursor/docs/rules-framework.md` for complete category definitions and usage guidelines

3. Rule Structure
- Description: Clear purpose statement
- Globs: Relevant file patterns
- Content: Max 25 lines, markdown format
- Cross-references: Use @ notation

4. Best Practices
- Rules guide, don't enforce
- Support project needs
- Clear documentation
- Maintainable structure
```

### @003_cursor_docs.mdc

```yaml
---
description: Organization of development documentation as part of the workspace scaffolding.
globs: .cursor/docs/**/*
---
## Documentation Framework

1. Purpose
- Support development process
- Document patterns and decisions
- Guide without constraining
- Enable knowledge sharing

2. Organization
- /ref/: External references and standards
- /temp/: Work in progress documentation
- /arch/: Architecture and design docs
- Project docs live outside .cursor/
```

### @004_cursor_tools.mdc

```yaml
---
description: Development tool management and configuration as part of workspace scaffolding.
globs: .cursor/tools/**/*
---
## Tool Framework

1. Purpose
- Support development workflow
- Provide utility scripts
- Configure development tools
- Enable project tooling

2. Organization
- Scripts: Development automation
- Config: Tool configurations
- Templates: Reusable patterns
- Project tools live outside .cursor/
```

## Development Standards (020-039)

### @020_code_standards.mdc

```yaml
---
description: Code style and practices for maintaining consistent, high-quality code.
globs: src/**/*.{ts,js,py}, backend/**/*.py
---
## Standards

1. Code Style
- Follow language-specific style guides
- Use consistent formatting
- Clear naming conventions
- Documentation requirements

2. Best Practices
- Code organization
- Error handling
- Testing requirements
- Performance considerations
```

### @021_testing.mdc

```yaml
---
description: Testing requirements and practices for ensuring code quality and reliability.
globs: src/**/*.test.ts, backend/**/*_test.py
---
## Testing Framework

1. Test Types
- Unit tests
- Integration tests
- End-to-end tests
- Performance tests

2. Coverage Requirements
- Minimum coverage targets
- Critical path testing
- Edge case handling
```

## Environment & Platform (040-059)

### @040_environment.mdc

```yaml
---
description: Development environment setup and configuration standards.
globs: .env.*, docker-compose.yml
---
## Environment Setup

1. Development Environment
- Required tools and versions
- Configuration management
- Local setup procedures

2. Environment Variables
- Configuration structure
- Security considerations
- Environment separation
```

## Integration & Security (060-079)

### @060_integration.mdc

```yaml
---
description: Integration standards for system components and external services.
globs: src/**/api/*, backend/**/integrations/*
---
## Integration Standards

1. API Standards
- Interface definitions
- Error handling
- Version management
- Documentation requirements

2. External Services
- Authentication
- Rate limiting
- Fallback strategies
```

## Project Management (080-099)

### @080_project.mdc

```yaml
---
description: Project organization and management standards.
globs: .github/**/*
---
## Project Standards

1. Project Structure
- Directory organization
- Naming conventions
- Configuration management
- Documentation requirements

2. Process Management
- Issue tracking
- Pull requests
- Code review
- Release process
```

## Frontend Rules (100-199)

### @100_frontend.mdc

```yaml
---
description: Core frontend architecture and systems.
globs: src/**/*
---
## Architecture

1. Core Systems
- State management
- Routing
- API integration
- Error handling

2. Component Structure
- Organization
- Reusability
- Documentation
- Testing requirements
```

## Backend Rules (200-299)

### @200_backend.mdc

```yaml
---
description: Core backend architecture and systems.
globs: backend/**/*
---
## Architecture

1. Core Systems
- Service layer
- Data models
- API endpoints
- Background tasks

2. Integration Points
- Database access
- External services
- Frontend API
- Monitoring
```
