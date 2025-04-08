/* eslint-disable @typescript-eslint/no-var-requires */
// This import method works with both ESM and CommonJS modules
import * as fs from 'fs';
import scanner from 'sonarqube-scanner';

// Read package.json
const packageJsonContent = fs.readFileSync('./package.json', 'utf8');
const packageJson = JSON.parse(packageJsonContent);

// Read environment variables with defaults
const sonarUrl = process.env.SONAR_SERVER_URL || 'http://localhost:9000';

scanner(
  {
    serverUrl: sonarUrl,
    options: {
      'sonar.projectName': packageJson.name,
      'sonar.projectDescription': packageJson.description,
      'sonar.projectVersion': packageJson.version,
      'sonar.projectKey': packageJson.name,
      'sonar.login': process.env.SONAR_LOGIN || 'admin',
      'sonar.password': process.env.SONAR_PASSWORD || 'admin@123',
      'sonar.sources': 'src',
      'sonar.tests': 'tests',
      'sonar.typescript.lcov.reportPaths': 'coverage/lcov.info',
      'sonar.javascript.lcov.reportPaths': 'coverage/lcov.info',
      'sonar.testExecutionReportPaths': 'coverage/test-report.xml',
      'sonar.coverage.exclusions':
        'tests/**,src/database/scripts/**,src/index.ts,src/utils/swagger.ts',
      'sonar.exclusions': 'node_modules/**,coverage/**,dist/**,tests/**',
    },
  },
  () => process.exit(),
);
