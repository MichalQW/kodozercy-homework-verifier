const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = process.env.INIT_CWD;

console.log('Homework Verifier setup starts...');

const installCypress = () => {
    console.log('Installing Cypress in:', projectRoot);
    exec('npm install cypress --save-dev mocha mochawesome mochawesome-merge mochawesome-report-generator', { cwd: projectRoot }, (err, stdout, stderr) => {
        if (err) {
            console.error('Error installing Cypress:', err);
            return;
        }
        console.log('Cypress and reporter dependencies installed successfully.');

        addCyRunScript();
        createCypressConfig();
        createExampleTestFile();
        createSupportFile();
    });
};

const createWorkflow = () => {
    const dirPath = path.join(projectRoot, '.github', 'workflows');
    if (fs.existsSync(dirPath)) return;
    fs.mkdirSync(dirPath, { recursive: true });

    const yamlContent = `name: Homework Validation and Cypress Tests

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  validate-tests-hash-and-execute:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Fetch Original Hash from Repository
        id: fetch-hash
        run: |
          ORIGINAL_TEST_URL="https://github.com/Devstock-Academy/Homework-Task-1/cypress/e2e/spec.cy.js"
          curl -fsSL "$ORIGINAL_TEST_URL" -o original_test_file.js
          EXPECTED_HASH=$(shasum -a 256 original_test_file.js | awk '{ print $1 }')
          echo "original_hash=$EXPECTED_HASH" >> $GITHUB_OUTPUT

      - name: Compute Test File Hash
        id: check
        run: |
          HASH=$(shasum -a 256 cypress/e2e/spec.cy.js | awk '{ print $1 }')
          echo "hash=$HASH" >> $GITHUB_OUTPUT

      - name: Verify Test File Integrity
        run: |
          ORIGINAL="\${{ steps.fetch-hash.outputs.original_hash }}"
          COMPUTED="\${{ steps.check.outputs.hash }}"

          if [[ "$COMPUTED" != "$ORIGINAL" ]]; then
            echo "🚫 TEST FILE HAS BEEN MODIFIED!"
            exit 1
          else
            echo "✅ Test file integrity verified."
          fi

      - name: Install dependencies
        run: npm install
        
      - name: Run Vite dev server
        run: npm run dev &

      - name: Wait for localhost to be ready
        run: npx wait-on http://localhost:5173 --timeout 60000

      - name: Run Cypress Tests
        run: |
          npm run build
          npm run cy:run

      - name: Merge JSON Results
        if: always()
        run: |
          npx mochawesome-merge cypress/results/*.json > cypress/results/output.json

      - name: Obtain OIDC Token and Send detailed test results
        if: always()
        env:
          ACTIONS_ID_TOKEN_REQUEST_URL: \${{ env.ACTIONS_ID_TOKEN_REQUEST_URL }}
          ACTIONS_ID_TOKEN_REQUEST_TOKEN: \${{ env.ACTIONS_ID_TOKEN_REQUEST_TOKEN }}
        run: |
          ID_TOKEN=\$(curl -H "Authorization: bearer \${ACTIONS_ID_TOKEN_REQUEST_TOKEN}" \
          "\${ACTIONS_ID_TOKEN_REQUEST_URL}&audience=homework-test-server" | jq -r '.value')

          TEST_RESULTS=\$(cat cypress/results/output.json | jq '.')

          curl -X POST https://express-server-test-hazel.vercel.app/api/results \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer \$ID_TOKEN" \
            -d @- <<EOF
          {
            "studentRepository": "\${{ github.repository }}",
            "commitSha": "\${{ github.sha }}",
            "testResult": \$TEST_RESULTS
          }
          EOF
`;

    fs.writeFileSync(path.join(dirPath, 'cypress.yml'), yamlContent);
    console.log('Workflow file created at:', path.join(dirPath, 'cypress.yml'));
};

const addCyRunScript = () => {
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    const newScript = "cypress run --reporter mochawesome --reporter-options reportDir=cypress/results,overwrite=false,html=false,json=true";

    packageJson.scripts = packageJson.scripts || {};
    if (packageJson.scripts['cy:run']) return;
    packageJson.scripts['cy:run'] = newScript;

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('cy:run script successfully added to package.json');
};

const createCypressConfig = () => {
    const configPath = path.join(projectRoot, 'cypress.config.js');
    if (fs.existsSync(configPath)) return;
    const configContent = `import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    specPattern: "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/e2e.js",
    baseUrl: 'http://localhost:5173',
  },
});
`;
    fs.writeFileSync(configPath, configContent);
    console.log('cypress.config.js created successfully at:', configPath);
};

const createExampleTestFile = () => {
    const testDirPath = path.join(projectRoot, 'cypress', 'e2e');
    if (fs.existsSync(testDirPath)) return;
    fs.mkdirSync(testDirPath, { recursive: true });

    const testFilePath = path.join(testDirPath, 'spec.cy.js');
    const testFileContent = `describe('Category A Tests', () => {
    it('Test A1 - dummy test', () => {
        cy.log('Running Test A1');
    });

    it('Test A2 - dummy test', () => {
        cy.log('Running Test A2');
    });

    it('Test A3 - dummy test', () => {
        cy.log('Running Test A3');
    });
});

describe('Category B Tests', () => {
    it('Test B1 - dummy test', () => {
        cy.log('Running Test B1');
    });

    it('Test B2 - dummy test', () => {
        cy.log('Running Test B2');
    });

    it('Test B3 - dummy test', () => {
        cy.log('Running Test B3');
    });
});
`;
    fs.writeFileSync(testFilePath, testFileContent);
    console.log('Example spec.cy.js created successfully at:', testFilePath);
};

const createSupportFile = () => {
    const supportDirPath = path.join(projectRoot, 'cypress', 'support');
    if (fs.existsSync(supportDirPath)) return;
    fs.mkdirSync(supportDirPath, { recursive: true });

    const supportFilePath = path.join(supportDirPath, 'e2e.js');
    fs.writeFileSync(supportFilePath, '');
    console.log('Empty support file created successfully at:', supportFilePath);
};

console.log('Homework Verifier setup completed.');

installCypress();
createWorkflow();