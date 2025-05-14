A Robust Express TypeScript backend application.

## Features

- **RESTful API** with Express.js and TypeScript
- **PostgreSQL database** with Drizzle ORM
- **Redis** for rate limiting and caching
- **Authentication & Authorization** using JWT
- **Input validation** using Zod
- **API documentation** with Swagger
- **Comprehensive error handling**
- **Logging** with Winston
- **Email service** with Nodemailer
- **Security** with Helmet and additional security middleware
- **Health check endpoints** for monitoring
- **Docker support** for easy deployment
- **Testing setup** with Vitest
- **Code quality analysis** with SonarQube

## Tech Stack

- **Node.js & Express.js** - Backend framework
- **TypeScript** - Type safety and maintainability
- **PostgreSQL** - Primary database
- **Drizzle ORM** - Database ORM
- **Redis** - Caching and rate limiting
- **Zod** - Input validation
- **JWT** - Authentication
- **Helmet** - Security best practices
- **Winston & Morgan** - Logging
- **Swagger** - API documentation
- **Vitest** - Fast and efficient testing
- **Docker & Docker Compose** - Containerization

## Project Structure

```
ts-node-express-boilerplate/
├── src/
│   ├── config/        # Application configuration
│   ├── controllers/   # Route controllers
│   ├── database/      # Database setup and migrations
│   ├── docs/          # API documentation
│   ├── middleware/    # Express middleware
│   ├── models/        # Data models and schemas
│   ├── routes/        # API routes
│   ├── services/      # Business logic
│   ├── types/         # TypeScript type definitions
│   ├── utils/         # Utility functions
│   ├── validators/    # Request validation
│   ├── app.ts         # Express app setup
│   ├── index.ts       # Application entry point
│   └── server.ts      # HTTP server setup
├── tests/             # Test files
├── .env               # Environment variables
├── .env.example       # Example environment variables
├── .env.test          # Test environment variables
├── docker-compose.yml # Docker Compose config
├── package.json       # Project dependencies and scripts
└── tsconfig.json      # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- Docker and Docker Compose (for containerized setup)
- PostgreSQL (if running locally)
- Redis (if running locally)

### Installation

1. Clone the repository

   ```
   git clone https://github.com/yourusername/ts-node-express-boilerplate.git
   cd ts-node-express-boilerplate
   ```

2. Install dependencies

   ```
   npm install
   ```

3. Set up environment variables
   ```
   cp .env.example .env
   ```
   Edit `.env` file with your configuration

### Running the Application

#### Using Docker (recommended)

Start all services:

```
docker-compose up -d
```

#### Locally

1. Make sure PostgreSQL and Redis are running
2. Run migrations:
   ```
   npm run migrate
   ```
3. Start the development server:
   ```
   npm run dev
   ```

### API Documentation

Once the server is running, access the Swagger documentation at:

```
http://localhost:3000/api-docs
```

## Database Management

- Generate database types:
  ```
  npm run generate-types
  ```
- Run migrations:
  ```
  npm run migrate
  ```
- Seed the database:
  ```
  npm run seed
  ```

## Testing

- Run all tests:
  ```
  npm test
  ```
- Run tests with coverage:
  ```
  npm run test:coverage
  ```
- Run tests in watch mode:
  ```
  npm run test:watch
  ```
- Run tests and SonarQube analysis:
  ```
  npm run test:sonar
  ```

## Code Quality with SonarQube

This project includes SonarQube integration for code quality and coverage analysis.

### Setup SonarQube

1. Start the SonarQube server using Docker Compose:

   ```
   docker-compose up -d sonarqube sonar-postgres
   ```

2. Wait for SonarQube to start (this may take a few minutes)

3. Access the SonarQube dashboard at http://localhost:9000

   - Default credentials: admin/admin
   - You'll be prompted to change the password on first login

4. Generate a token in SonarQube:

   - Go to User > My Account > Security
   - Generate a token and copy it

5. Add the token to your .env file:
   ```
   SONAR_LOGIN=your_generated_token
   SONAR_SERVER_URL=http://localhost:9000
   ```

### Run Code Analysis

1. Run the combined test coverage and SonarQube analysis:

   ```
   npm run test:sonar
   ```

   This will:

   - Run tests with coverage using Vitest
   - Generate coverage reports in multiple formats (LCOV, HTML, JSON)
   - Generate a SonarQube-compatible test execution report
   - Run the SonarQube scanner to upload results

2. View the results in the SonarQube dashboard at http://localhost:9000

### Configuration Files

- **vitest.config.ts**: Configures Vitest testing setup, coverage thresholds, and reporters
- **sonar-scanner.ts**: Configures SonarQube scanner with project details and coverage paths

### Advanced Testing Options

For more granular control over testing and reporting:

- To run a specific test file:

  ```
  npx vitest run path/to/test/file.test.ts
  ```

- To run tests with specific tag:

  ```
  npx vitest run --mode="tag"
  ```

- To view coverage in the browser:
  ```
  npx vitest --coverage --ui
  ```

## Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server
- `npm run build` - Build the TypeScript code
- `npm run lint` - Lint the code
- `npm run format` - Format the code with Prettier
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run test:sonar` - Run tests with coverage and SonarQube analysis
- `npm run sonar` - Run SonarQube analysis only
- `npm run seed` - Seed the database
- `npm run db:generate` - Generate Drizzle migrations
- `npm run db:push` - Push Drizzle migrations
- `npm run db:drop` - Drop database tables

## License

MIT
