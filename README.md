# DDFetch

DDFetch is an Angular application designed to simplify and accelerate the process of building Datadog log queries for Accela environments. It provides a user-friendly interface for support and engineering teams to generate precise Datadog queries based on environment, application, and trace ID information.

## Features

- **Datadog Query Builder:** Easily construct complex Datadog queries for Civic Platform, Citizen Access (ACA), and CAPI logs.
- **Trace ID Search:** Paste a trace ID to automatically extract date and generate the correct query and time window.
- **Environment & Application Filters:** Select environment (PROD, TEST, STG, etc.) and applications to tailor your search.
- **Timestamp Handling:** Automatically sets and validates timeframes based on user input or trace ID.
- **Rehydration Support:** Detects when a query requires Datadog log rehydration and generates the appropriate URL.
- **Additional Parameters:** Add custom search parameters to further refine your queries.

## Getting Started

1. Run `ng serve` to start the development server.
2. Open `http://localhost:4200/` in your browser.
3. Fill in the form fields to generate Datadog queries and open them directly in Datadog.

## Development

- Built with [Angular CLI](https://github.com/angular/angular-cli).
- See below for standard Angular commands for building, testing, and scaffolding.

## Standard Angular CLI Usage

- `ng build` - Build the project.
- `ng test` - Run unit tests.
- `ng e2e` - Run end-to-end tests.
- `ng generate component component-name` - Generate a new component.

## Further Help

For help and usage instructions, click the <strong>question mark icon</strong> in the bottom right of the application to open the in-app README and tips.

---
GoFetch streamlines Datadog troubleshooting for Accela teams by making log search fast, accurate, and accessible.
