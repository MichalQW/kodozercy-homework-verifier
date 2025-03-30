# Homework Verifier Monorepo

This monorepo hosts two key applications aimed at automating homework validation and results reporting:

1. **`hwv-project-setup`** - An **NPM package** dedicated to setting up automated Cypress tests.
2. **`hmv-backend-vercel`** - A **serverless backend application** designed to securely receive and validate GitHub test execution results via GitHub's OIDC.

---

## 1. hwv-project-setup (NPM Package)

### Overview

This package provides an easy-to-setup mechanism for automatically installing and configuring Cypress along with related tools, enabling repositories to run standardized automated testing workflows.

### Key Functionalities

- **Automated Cypress Installation**: Installs Cypress and essential reporting tools (`mocha`, `mochawesome`, `mochawesome-merge`, `mochawesome-report-generator`) through a post-install script.
- **GitHub Workflow Automation**: Creates a GitHub Actions workflow file (`cypress.yml`) that performs:
    - Test file integrity verification using SHA256 checksums to ensure tests aren't modified.
    - Execution of Cypress tests.
    - Aggregation and merging of test reports.
    - Sending detailed test results securely to the backend using a GitHub-provided OIDC token.

### Usage

Simply include this as a dependency in your project:
```shell script
npm install mydevcave-hwv-project-setup
```

### After Installation

The installation script will automatically:

- Add necessary scripts to your project's `package.json`.
- Configure Cypress along with example tests and support files.
- Setup a GitHub Actions workflow under `.github/workflows`.

---

## 2. hmv-backend-vercel (Serverless Application)

### Overview

This application acts as a secure serverless endpoint hosted on platforms such as Vercel, designed to receive and verify test results from GitHub Actions via an OIDC token to ensure authenticity and security.

### Key Functionalities

- **JWT Verification with GitHub OIDC**: Ensures requests originate from legitimate GitHub repositories authorized via GitHub Actions tokens.
- **Secure Validation of Results**: Validates incoming data for required fields (`studentRepository`, `commitSha`, `testResult`) and compares the repository identity from the token against the submitted data to prevent spoofing attacks.
- **Results Handling and Logging**: Prints detailed validation results securely and returns confirmation upon successful data verification.

### API Endpoint

**POST** `/api/results`

Request Headers:
```
Authorization: Bearer <GitHub OIDC Token>
Content-Type: application/json
```

Request Body:
```json
{
  "studentRepository": "<github.repository>",
  "commitSha": "<commit SHA>",
  "testResult": { ... Cypress Test Results ... }
}
```

Response Example (Success):
```json
{
  "status": "ok",
  "message": "Result received and verified.",
  "data": {
    "github_sub": "<GitHub token subject>",
    "repository": "<github.repository>",
    "commit": "<commit SHA>",
    "testResult": { ... test results ... }
  }
}
```

---

## License
Business Source License 1.1 (BSL-1.1)

Copyright © 2025 mydevcave

Permission is granted to view and inspect the source code of this software.

Any modification, redistribution, or production/commercial use of this software requires explicit written permission from the author.

For obtaining permission or a commercial license, please contact me.