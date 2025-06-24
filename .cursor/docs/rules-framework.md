# MDC Rules Index

## Overview

This document serves as the master index for MDC (Module Definition and Configuration) rules. These rules provide development scaffolding around your project, offering guidance and structure without imposing on the core project functionality.

The `.cursor/` directory and its contents serve purely as development support, maintaining a clear separation between:

- Project code (your actual application/system)
- Development scaffolding (rules, documentation, and tools that support development)

## Best Practices Reference

- Keep rules under 25 lines
- Use hierarchical numbering reflecting system architecture:
  - 000-019: Core scaffolding and workspace rules
  - 020-099: Development support rules
  - 100+: Project-specific rules
- Include globs for relevant files
- Focus on key directives and integration points
- Use @ tags for cross-references
- Maintain clear separation between scaffolding and project code

## Rule Categories

### System-wide Rules (000-099) [Standard]

#### Core Framework (000-019) [Standard]

- @000_rules-index.md (markdown, not .mdc): Master index and documentation
- @001_workspace.mdc: Core workspace definition and constraints
- @002_cursor_rules.mdc: MDC file standards and structure
- @003_cursor_docs.mdc: Documentation organization
- @004_cursor_tools.mdc: Development tooling

#### Development Standards (020-039) [Standard]

- @020_code_standards.mdc: Code style and practices
- @021_testing.mdc: Testing requirements and practices
- @022_build.mdc: Build process standards
- @023_dependencies.mdc: Dependency management
- @024_version_control.mdc: Version control practices

#### Environment & Platform (040-059) [Project-Specific]

- @040_environment.mdc: Development environment setup
- @041_platform.mdc: Platform-specific requirements
- @042_toolchain.mdc: Development toolchain
- @043_runtime.mdc: Runtime requirements

#### Integration & Security (060-079) [Project-Specific]

- @060_integration.mdc: Integration standards
- @061_security.mdc: Security requirements
- @062_api.mdc: API standards
- @063_auth.mdc: Authentication and authorization

#### Project Management (080-099) [Standard]

- @080_project.mdc: Project organization
- @081_release.mdc: Release management
- @082_documentation.mdc: Documentation standards
- @083_change.mdc: Change management process

### Frontend Rules (100-199) [Project-Specific]

Example frontend rules structure (customize for your project):

- @100_frontend.mdc: Core frontend architecture and systems
- @101_ui_components.mdc: UI component standards
- @102_state_management.mdc: State management patterns
- @103_routing.mdc: Navigation and routing
- @104_api_integration.mdc: Frontend-backend integration

### Backend Rules (200-299) [Project-Specific]

Example backend rules structure (customize for your project):

- @200_backend.mdc: Core backend architecture and systems
- @201_api_design.mdc: API design patterns
- @202_data_models.mdc: Data model standards
- @203_services.mdc: Service layer organization
- @204_persistence.mdc: Data persistence patterns

### Project-Specific Rules (300-399) [Project-Specific]

Customize these sections based on your project needs. Example structure:

#### Core Project Structure (300-309)

- @300_project_structure.mdc: Overall project organization
- @301_workspace_layout.mdc: Workspace directory structure

#### Domain-Specific Rules (310-329)

Add rules specific to your project's domain and requirements

#### Build and Deploy (330-349)

- @330_build_process.mdc: Build pipeline configuration
- @331_deployment.mdc: Deployment procedures
- @332_monitoring.mdc: Production monitoring

## Initialization and Customization

### Initial Setup Process

1. Project Description

   - Provide a high-level description of your project to your AI assistant
   - Include key technical requirements and architectural decisions
   - Describe any unique aspects or constraints of your project

2. AI-Guided Customization

   - The AI assistant will ask clarifying questions about your project
   - Based on your answers, it will customize @000_rules-index.md
   - It will generate appropriate MDC rule YAML blocks for your specific needs
   - Rules marked [Standard] typically remain unchanged
   - Rules marked [Project-Specific] will need customization

3. Iterative Development
   - Rules can and should evolve with your project
   - Start with essential rules and add more as needed
   - Modify existing rules as requirements change
   - The AI assistant can help refine rules throughout development

### Customization Guidelines

1. Standard Rules

   - Core framework rules (000-019) provide the foundation
   - Development standards (020-039) ensure consistency
   - Project management rules (080-099) guide process

2. Project-Specific Rules

   - Environment & platform rules adapt to your tech stack
   - Integration & security rules match your architecture
   - Frontend/backend rules reflect your chosen frameworks
   - Domain-specific rules capture your unique requirements

3. Best Practices
   - Keep rules focused and concise
   - Document integration points clearly
   - Update rules when architectural decisions change
   - Remove or archive unused rules

## MDC Rule Format

Every MDC rule file should follow this format:

```yaml
---
description: Clear, concise description of the rule's purpose
globs: pattern/to/match/**/*, another/pattern/**/*.ts # Files this rule applies to
---
## Section Heading

1. Key Point
- Bullet points
- Max 25 lines total
- Clear, actionable items

2. Another Point
- More details
- Keep it focused

3. Integration Points
- Cross-references using @tags
- File patterns
- Key relationships
```

## Implementation Notes

1. Rules are organized by architectural layer and responsibility
2. Frontend core (100s) handles client-side logic
3. Backend core (200s) manages server-side operations
4. Each rule focuses on its core responsibility while documenting integration points
5. Cross-references (@tags) ensure clear system relationships
6. All rules follow the 25-line limit while maintaining clarity

## Next Steps

1. Review and refine rule contents for your project
2. Verify glob patterns match your file structure
3. Ensure all critical integration points are covered
4. Add project-specific rules as needed
5. Implement rules through Cursor UI

---

## Example Project-Specific Rules

Below are examples from a font development project showing how to extend the base rules for specific project needs:

### Frontend Example (@100_frontend.mdc)

```yaml
---
description: The frontend system provides the Electron-based user interface for font design and editing, built with TypeScript and React.
globs: src/renderer/**/*
---
## Core Architecture
1. Core Systems
   - Event system for module communication
   - History system for undo/redo
   - Font operations for file management
   - Command system for user actions

2. Module Structure
   - Canvas for glyph editing
   - Gallery for character management
   - Toolbar for editing tools
   - Analytics for metrics

3. Integration Points
   - Backend Integration:
     - backend/**/*: Font processing engine and data transformation
     - src/main/python/bridge.ts: Bi-directional IPC for font operations
   - Project Lifecycle:
     - backend/font_initializer.py: Project creation and setup
     - backend/build_pipeline.py: Font compilation and export
```

### Backend Example (@200_backend.mdc)

```yaml
---
description: The backend system provides Python-based font processing, generation, and analysis capabilities.
globs: backend/**/*
---
## Core Architecture
1. Processing Pipeline
   - Font initialization and setup
   - SVG to UFO conversion
   - Weight calculation and interpolation
   - Build process orchestration

2. File Management
   - Project structure creation
   - Template application
   - Reference font handling
   - Export generation

3. Integration Points
   - Frontend Bridge:
     - src/renderer/**/*: UI state synchronization
     - src/renderer/core/font-operations.ts: Font data exchange
   - Editor Integration:
     - src/renderer/modules/canvas/canvas.ts: Path processing
     - src/renderer/modules/analytics/analytics.ts: Font analysis
```
