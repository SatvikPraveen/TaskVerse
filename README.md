# TaskVerse 🚀

A modern, enterprise-grade task management application built with cutting-edge technologies. TaskVerse combines real-time collaboration, intelligent task organization, and comprehensive analytics in a beautiful, responsive interface.

[![CI/CD](https://github.com/SatvikPraveen/TaskVerse/workflows/CI/badge.svg)](https://github.com/SatvikPraveen/TaskVerse/actions)
[![E2E Tests](https://github.com/SatvikPraveen/TaskVerse/workflows/E2E/badge.svg)](https://github.com/SatvikPraveen/TaskVerse/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)](https://mongodb.com/)

## 🌟 Key Features

### 🔄 Real-time Collaboration
- **Live Updates**: Instant task synchronization across all connected clients using Socket.io
- **Real-time Notifications**: Get notified when tasks are created, updated, or completed
- **Collaborative Workspace**: Multiple users can work on tasks simultaneously

### 📋 Advanced Task Management
- **Smart Task Creation**: Rich task creation with priorities, due dates, and categories
- **Task Hierarchy**: Organize tasks with nested subtasks and dependencies
- **Bulk Operations**: Perform actions on multiple tasks simultaneously
- **Advanced Filtering**: Filter by status, priority, category, assignee, and date ranges
- **Task Templates**: Create reusable task templates for common workflows

### 🗂️ Intelligent Organization
- **Custom Categories**: Create and manage unlimited task categories with color coding
- **Dynamic Sorting**: Sort tasks by priority, due date, creation date, or custom criteria
- **Search & Discovery**: Full-text search across tasks, descriptions, and attachments
- **Tag System**: Flexible tagging system for enhanced organization

### 📊 Analytics & Insights
- **Interactive Dashboard**: Visual overview of task distribution and progress
- **Performance Metrics**: Track completion rates, productivity trends, and bottlenecks
- **Category Analytics**: Understand workload distribution across different areas
- **Time Tracking**: Monitor time spent on tasks and projects
- **Export Reports**: Generate detailed reports in various formats

### 🔐 Enterprise Security
- **JWT Authentication**: Secure token-based authentication with refresh token rotation
- **Role-based Access**: Granular permissions and user role management
- **Rate Limiting**: Protection against abuse with intelligent rate limiting
- **Data Encryption**: End-to-end encryption for sensitive data
- **Audit Logging**: Comprehensive activity logs for compliance

### 📁 File Management
- **Drag & Drop Upload**: Intuitive file attachment system
- **Cloud Storage**: AWS S3/MinIO integration for scalable file storage
- **File Versioning**: Track file changes and maintain version history
- **Preview Support**: In-app preview for common file types
- **Access Control**: Fine-grained file access permissions

### 📱 Cross-Platform Experience
- **Responsive Design**: Seamless experience across desktop, tablet, and mobile
- **Progressive Web App**: Offline capability and native app-like experience
- **Dark/Light Mode**: Customizable themes for user preference
- **Accessibility**: WCAG 2.1 compliant for inclusive design

## 🏗️ Technical Architecture

### Frontend Stack
- **React 18** with TypeScript for type-safe, component-based UI
- **Vite** for lightning-fast development and optimized builds
- **Tailwind CSS** for utility-first styling and consistent design
- **React Query (TanStack Query)** for intelligent data fetching and caching
- **React Router** for client-side routing and navigation
- **Zustand** for lightweight state management
- **React Hook Form** with Zod validation for robust form handling

### Backend Stack
- **Node.js** with Express.js for scalable server-side logic
- **MongoDB** with Mongoose ODM for flexible data modeling
- **Socket.io** for real-time bidirectional communication
- **JWT** with refresh token rotation for secure authentication
- **Helmet** and security middleware for protection against common vulnerabilities
- **Winston** for comprehensive logging and monitoring

### DevOps & Quality
- **Docker** containerization for consistent deployment environments
- **GitHub Actions** for automated CI/CD pipelines
- **Jest** for comprehensive unit and integration testing
- **Playwright** for reliable end-to-end testing
- **ESLint** and **Prettier** for code quality and consistency
- **Turborepo** for efficient monorepo management

## 🚀 Quick Start Guide

### Prerequisites

Ensure you have the following installed:
- **Node.js** 18.0.0 or higher
- **npm** 8.0.0 or higher
- **MongoDB** 5.0 or higher (or MongoDB Atlas)
- **Docker** (optional, for containerized setup)

### Option 1: Docker Setup (Recommended)

The fastest way to get TaskVerse running:

```bash
# Clone the repository
git clone https://github.com/SatvikPraveen/TaskVerse.git
cd TaskVerse

# Start all services with Docker
cp docker/.env.example docker/.env
npm run docker:up

# Access the application
# Frontend: http://localhost:5173
# API: http://localhost:3001
# MongoDB Express: http://localhost:8081
```

### Option 2: Manual Setup

For development or custom configurations:

```bash
# Clone and install dependencies
git clone https://github.com/SatvikPraveen/TaskVerse.git
cd TaskVerse
npm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Configure your environment variables
# Edit apps/api/.env and apps/web/.env with your settings

# Start MongoDB (if running locally)
mongod --dbpath /path/to/your/db

# Start the development servers
npm run dev
```

### Environment Configuration

#### API Environment Variables (`apps/api/.env`)
```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/TaskVerse
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-token-secret
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_BUCKET_NAME=TaskVerse-uploads
AWS_REGION=us-east-1
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Web Environment Variables (`apps/web/.env`)
```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
VITE_APP_NAME=TaskVerse
VITE_APP_VERSION=1.0.0
```

## 📁 Project Architecture

TaskVerse follows a modern monorepo architecture with clear separation of concerns:

```
TaskVerse/
├── 🗂️ apps/
│   ├── 🔧 api/                    # Backend API Server
│   │   ├── src/
│   │   │   ├── config/           # Configuration (DB, ENV, Logger)
│   │   │   ├── middleware/       # Express middleware
│   │   │   ├── modules/          # Feature modules
│   │   │   │   ├── auth/         # Authentication system
│   │   │   │   ├── tasks/        # Task management
│   │   │   │   ├── categories/   # Category system
│   │   │   │   ├── users/        # User management
│   │   │   │   └── uploads/      # File upload handling
│   │   │   ├── sockets/          # Real-time communication
│   │   │   ├── tests/            # Integration tests
│   │   │   └── utils/            # Utility functions
│   │   └── Dockerfile            # Container configuration
│   │
│   └── 🎨 web/                   # Frontend React Application
│       ├── src/
│       │   ├── api/              # API client layer
│       │   ├── components/       # Reusable UI components
│       │   ├── features/         # Feature-based modules
│       │   │   ├── auth/         # Login/Register pages
│       │   │   ├── tasks/        # Task management UI
│       │   │   ├── categories/   # Category management
│       │   │   └── dashboard/    # Analytics dashboard
│       │   ├── hooks/            # Custom React hooks
│       │   ├── routes/           # Routing configuration
│       │   ├── store/            # State management
│       │   ├── styles/           # Global styles
│       │   ├── tests/            # E2E tests
│       │   └── utils/            # Frontend utilities
│       └── public/               # Static assets
│
├── 📦 packages/                  # Shared Libraries
│   ├── types/                    # Shared TypeScript definitions
│   │   └── zod/                  # Validation schemas
│   ├── utils/                    # Shared utility functions
│   └── eslint-config/            # Shared linting rules
│
├── 🐳 docker/                    # Docker configuration
├── 📚 docs/                      # Documentation
├── 🏗️ infra/                     # Infrastructure as Code
└── 🔧 Configuration Files        # Root-level configs
```

### Key Architectural Decisions

- **Modular Design**: Each feature is self-contained with its own routes, controllers, models, and tests
- **Type Safety**: End-to-end TypeScript with shared type definitions
- **Schema Validation**: Zod schemas for runtime type checking and validation
- **Clean API Design**: RESTful endpoints with consistent error handling
- **Real-time First**: Socket.io integration for live updates
- **Testing Strategy**: Comprehensive testing at unit, integration, and E2E levels

## 🛠️ Development Workflow

### Available Scripts

```bash
# Development
npm run dev              # Start all services in development mode
npm run dev:api          # Start only the API server
npm run dev:web          # Start only the web application

# Building
npm run build            # Build all packages for production
npm run build:api        # Build only the API
npm run build:web        # Build only the web app

# Testing
npm run test             # Run all tests
npm run test:api         # Run API unit and integration tests
npm run test:web         # Run web unit tests
npm run e2e              # Run end-to-end tests
npm run e2e:headed       # Run E2E tests with browser UI

# Code Quality
npm run lint             # Lint all packages
npm run lint:fix         # Fix linting issues automatically
npm run typecheck        # TypeScript type checking
npm run format           # Format code with Prettier

# Docker
npm run docker:up        # Start all services with Docker
npm run docker:down      # Stop all Docker services
npm run docker:logs      # View Docker container logs

# Database
npm run db:seed          # Seed database with sample data
npm run db:migrate       # Run database migrations
npm run db:reset         # Reset database to initial state
```

### Development Guidelines

#### Code Style
- Use TypeScript for all new code
- Follow the established ESLint and Prettier configurations
- Write meaningful commit messages following conventional commits
- Add JSDoc comments for public APIs

#### Testing Strategy
- Write unit tests for business logic
- Add integration tests for API endpoints
- Create E2E tests for critical user flows
- Maintain >80% code coverage

#### Git Workflow
```bash
# Create a feature branch
git checkout -b feature/amazing-new-feature

# Make your changes and commit
git add .
git commit -m "feat: add amazing new feature"

# Push and create a pull request
git push origin feature/amazing-new-feature
```

## 🔧 Configuration & Customization

### Database Configuration

TaskVerse supports both local MongoDB and MongoDB Atlas:

```javascript
// Local MongoDB
MONGODB_URI=mongodb://localhost:27017/TaskVerse

// MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/TaskVerse
```

### File Storage Configuration

Choose between AWS S3 or MinIO for file storage:

```javascript
// AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_BUCKET_NAME=your-bucket
AWS_REGION=us-east-1

// MinIO (S3-compatible)
AWS_ENDPOINT=http://localhost:9000
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
```

### Socket.io Configuration

Customize real-time features:

```javascript
// Enable/disable specific features
SOCKET_ENABLED=true
SOCKET_CORS_ORIGIN=http://localhost:5173
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000
```

## 🧪 Testing Strategy

### Unit Tests (Jest)
```bash
# Run all unit tests
npm run test:api

# Run with coverage
npm run test:api -- --coverage

# Run specific test file
npm run test:api -- auth.test.ts

# Watch mode
npm run test:api -- --watch
```

### Integration Tests
```bash
# Run integration tests
npm run test:api -- --testPathPattern=int.test

# Test specific endpoint
npm run test:api -- tasks.int.test.ts
```

### End-to-End Tests (Playwright)
```bash
# Run E2E tests
npm run e2e

# Run with UI
npm run e2e:headed

# Run specific test
npm run e2e -- auth.e2e.spec.ts

# Debug mode
npm run e2e -- --debug
```

### Test Coverage Goals
- **Unit Tests**: >90% for business logic
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user journeys

## 🚢 Deployment Guide

### Production Build

```bash
# Build for production
npm run build

# Test production build locally
npm run preview
```

### Docker Deployment

```bash
# Build production images
docker build -f apps/api/Dockerfile -t TaskVerse-api .
docker build -f apps/web/Dockerfile -t TaskVerse-web .

# Deploy with docker-compose
cp docker/.env.example docker/.env.production
docker-compose -f docker/docker-compose.prod.yml up -d
```

### Cloud Deployment Options

#### Vercel (Frontend)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd apps/web
vercel --prod
```

#### Railway (Backend)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
cd apps/api
railway login
railway deploy
```

#### AWS/Azure/GCP
- Use the provided Docker configurations
- Set up environment variables in your cloud platform
- Configure MongoDB Atlas for database
- Set up S3 or equivalent for file storage

### Environment Variables for Production

Ensure these are set in your production environment:

```bash
# API
NODE_ENV=production
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=strong-production-secret
AWS_ACCESS_KEY_ID=production-key
AWS_SECRET_ACCESS_KEY=production-secret

# Web
VITE_API_URL=https://your-api-domain.com
VITE_SOCKET_URL=https://your-api-domain.com
```

## 🔒 Security Considerations

TaskVerse implements security best practices:

- **Authentication**: JWT with refresh token rotation
- **Authorization**: Role-based access control
- **Input Validation**: Zod schema validation
- **Rate Limiting**: Configurable rate limits
- **CORS**: Proper cross-origin resource sharing
- **Helmet**: Security headers protection
- **Data Sanitization**: MongoDB injection prevention
- **File Upload Security**: Type and size validation

## 🌍 Browser Support

TaskVerse supports all modern browsers:

- **Chrome** 90+
- **Firefox** 88+
- **Safari** 14+
- **Edge** 90+

## 📈 Performance Optimization

- **Code Splitting**: Lazy loading for routes and components
- **Bundle Analysis**: Webpack bundle analyzer integration
- **Image Optimization**: Automatic image compression and resizing
- **Caching**: Redis integration for session and data caching
- **CDN Ready**: Static assets optimized for CDN delivery
- **Database Indexing**: Optimized MongoDB indexes

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started
1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/TaskVerse.git`
3. Create a feature branch: `git checkout -b feature/amazing-feature`
4. Install dependencies: `npm install`
5. Start development: `npm run dev`

### Making Changes
1. Write tests for new features
2. Ensure all tests pass: `npm test`
3. Follow the code style: `npm run lint`
4. Update documentation if needed

### Submitting Changes
1. Commit your changes: `git commit -m 'feat: add amazing feature'`
2. Push to your fork: `git push origin feature/amazing-feature`
3. Create a Pull Request

### Contribution Types
- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- ⚡ Performance improvements
- 🧪 Test coverage improvements

## 📚 Documentation

- **[API Documentation](docs/api-contract.md)**: Complete API reference
- **[Architecture Guide](docs/architecture.md)**: System design and decisions
- **[Deployment Guide](docs/deployment.md)**: Production deployment instructions
- **[Contributing Guide](CONTRIBUTING.md)**: Detailed contribution guidelines

## 🗺️ Roadmap

### Version 2.0 (Q3 2025)
- [ ] Team workspaces and collaboration
- [ ] Advanced task dependencies
- [ ] Time tracking and reporting
- [ ] Mobile applications (React Native)
- [ ] API rate limiting per user
- [ ] Advanced search with filters

### Version 2.1 (Q4 2025)
- [ ] Task templates and automation
- [ ] Calendar integration
- [ ] Email notifications
- [ ] Third-party integrations (Slack, Discord)
- [ ] Advanced analytics and insights

### Version 3.0 (Q1 2026)
- [ ] AI-powered task suggestions
- [ ] Voice commands and dictation
- [ ] Advanced project management features
- [ ] White-label solutions
- [ ] Enterprise SSO integration

## 🆘 Support & Community

- **📧 Email Support**: [support@taskverse.com](mailto:support@taskverse.com)
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/SatvikPraveen/TaskVerse/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/SatvikPraveen/TaskVerse/discussions)
- **📖 Documentation**: [Wiki](https://github.com/SatvikPraveen/TaskVerse/wiki)

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 Satvik Praveen

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

## 🙏 Acknowledgments

Special thanks to:
- The open-source community for amazing tools and libraries
- Contributors who help make TaskVerse better
- Early users who provided valuable feedback
- The React, Node.js, and MongoDB communities

---

<div align="center">

**Built with ❤️ by [Satvik Praveen](https://github.com/SatvikPraveen)**

⭐ **Star this repo if you find it helpful!** ⭐

[🚀 Get Started](#-quick-start-guide) • [📚 Documentation](docs/) • [🤝 Contribute](#-contributing) • [🆘 Support](#-support--community)

</div>