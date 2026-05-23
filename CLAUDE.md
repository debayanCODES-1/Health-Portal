# Health Portal Development Guidelines

This document outlines command execution structures and styling standards for development within the Health Portal repository.

## Command Reference

### Build and Run

* **Development Server**: `npm run dev`
* **Production Build**: `npm run build`
* **Production Start**: `npm start`
* **Setup Script**: `node scripts/setup-env.js` (generates fresh secrets and default `.env`)
* **Docker Composition**: `docker-compose up --build` (launches database, cache, and runs setup tasks)

### Testing and Validation

* **Run Tests**: `npm test`
* **Run Tests with Coverage**: `npx jest --coverage`
* **Linting Rules**: `npm run lint`

---

## Coding Standards

### TypeScript and ESM

* Enforce strict type checking in configurations.
* Use ES modules for imports and exports.
* Do not use default exports for route handlers; export HTTP method functions (`GET`, `POST`, etc.) directly.

### Imports

* Use absolute import aliases starting with `@/` matching the root source directory.
* Direct internal dependency layers should follow clean separation (e.g. database transactions inside handlers, utility decorators for middleware).

### CSS and Styles

* Tailor styles through TailwindCSS version 4 configuration files.
* Minimize inline custom declarations; reference utility classes directly.
