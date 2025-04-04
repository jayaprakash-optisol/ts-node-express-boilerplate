A robust, enterprise-level Express TypeScript backend application for tracking and managing data leaks.

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
- **Testing setup** with Jest

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
- **Nodemailer** - Email service
- **Jest** - Testing
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
- Run unit tests:
  ```
  npm run test:unit
  ```
- Run integration tests:
  ```
  npm run test:integration
  ```
- Run tests in watch mode:
  ```
  npm run test:watch
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
   SONAR_TOKEN=your_generated_token
   SONAR_SERVER_URL=http://localhost:9000
   ```

### Run Code Analysis

1. Run tests with coverage:

   ```
   npm test
   ```

2. Run SonarQube analysis:

   ```
   npm run sonar
   ```

3. View the results in the SonarQube dashboard at http://localhost:9000

### Troubleshooting

- If SonarQube fails to start, try:

  ```
  docker-compose down
  docker-compose up -d sonar-postgres
  docker-compose up -d sonarqube
  ```

- If you encounter memory errors, increase Docker memory limits in Docker Desktop settings

- To check container logs:
  ```
  docker logs sonarqube
  ```

### Stopping SonarQube

When you're done with SonarQube, you can stop it:

```
docker-compose stop sonarqube sonar-postgres
```

To remove the containers:

```
docker-compose rm -f sonarqube sonar-postgres
```

## Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server
- `npm run build` - Build the TypeScript code
- `npm run lint` - Lint the code
- `npm run format` - Format the code with Prettier
- `npm test` - Run tests with coverage
- `npm run migrate` - Run database migrations
- `npm run swagger` - Generate Swagger documentation
- `npm run sonar` - Run SonarQube analysis

## License

MIT
