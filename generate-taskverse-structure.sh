#!/bin/bash

# Taskverse Project Structure Generator
# This script generates the complete folder structure and files for the Taskverse project

set -e  # Exit on any error

PROJECT_NAME="taskverse"

echo "🚀 Generating Taskverse project structure..."

# Create root directory
mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME"

# Root level files
touch .editorconfig
touch .gitignore
touch .prettierrc
touch eslint.config.cjs
touch package.json
touch tsconfig.base.json
touch turbo.json
touch README.md

# Create docs directory
mkdir -p docs
touch docs/architecture-diagram.svg
touch docs/api-contract.md

# Create .github workflows
mkdir -p .github/workflows
touch .github/workflows/ci.yml
touch .github/workflows/e2e.yml

# Create docker directory
mkdir -p docker
touch docker/docker-compose.yml
touch docker/.env.example

# Create infra directory (optional)
mkdir -p infra
touch infra/README.md

# Create packages structure
mkdir -p packages/types/zod
touch packages/types/package.json
touch packages/types/tsconfig.json
touch packages/types/zod/auth.schema.ts
touch packages/types/zod/task.schema.ts
touch packages/types/zod/category.schema.ts
touch packages/types/index.ts

mkdir -p packages/eslint-config
touch packages/eslint-config/package.json
touch packages/eslint-config/index.cjs

mkdir -p packages/utils
touch packages/utils/package.json
touch packages/utils/date.ts

# Create apps/api structure
mkdir -p apps/api/src/config
mkdir -p apps/api/src/middleware
mkdir -p apps/api/src/modules/auth
mkdir -p apps/api/src/modules/users
mkdir -p apps/api/src/modules/categories
mkdir -p apps/api/src/modules/tasks
mkdir -p apps/api/src/modules/uploads
mkdir -p apps/api/src/sockets
mkdir -p apps/api/src/utils
mkdir -p apps/api/src/tests

# API root files
touch apps/api/package.json
touch apps/api/tsconfig.json
touch apps/api/jest.config.cjs
touch apps/api/.env.example
touch apps/api/Dockerfile

# API src files
touch apps/api/src/server.ts
touch apps/api/src/app.ts

# API config files
touch apps/api/src/config/env.ts
touch apps/api/src/config/db.ts
touch apps/api/src/config/logger.ts

# API middleware files
touch apps/api/src/middleware/auth.ts
touch apps/api/src/middleware/error.ts
touch apps/api/src/middleware/cors.ts
touch apps/api/src/middleware/rateLimit.ts

# API modules - auth
touch apps/api/src/modules/auth/auth.routes.ts
touch apps/api/src/modules/auth/auth.controller.ts
touch apps/api/src/modules/auth/auth.service.ts
touch apps/api/src/modules/auth/auth.model.ts

# API modules - users
touch apps/api/src/modules/users/user.routes.ts
touch apps/api/src/modules/users/user.controller.ts
touch apps/api/src/modules/users/user.model.ts

# API modules - categories
touch apps/api/src/modules/categories/category.routes.ts
touch apps/api/src/modules/categories/category.controller.ts
touch apps/api/src/modules/categories/category.model.ts

# API modules - tasks
touch apps/api/src/modules/tasks/task.routes.ts
touch apps/api/src/modules/tasks/task.controller.ts
touch apps/api/src/modules/tasks/task.model.ts

# API modules - uploads
touch apps/api/src/modules/uploads/upload.routes.ts
touch apps/api/src/modules/uploads/s3.client.ts

# API sockets
touch apps/api/src/sockets/init.ts
touch apps/api/src/sockets/tasks.nsp.ts

# API utils
touch apps/api/src/utils/jwt.ts
touch apps/api/src/utils/passwords.ts
touch apps/api/src/utils/pagination.ts

# API tests
touch apps/api/src/tests/setup.ts
touch apps/api/src/tests/auth.int.test.ts
touch apps/api/src/tests/tasks.int.test.ts
touch apps/api/src/tests/categories.int.test.ts

# Create apps/web structure
mkdir -p apps/web/public
mkdir -p apps/web/src/routes
mkdir -p apps/web/src/api
mkdir -p apps/web/src/features/auth
mkdir -p apps/web/src/features/dashboard/charts
mkdir -p apps/web/src/features/tasks
mkdir -p apps/web/src/features/categories
mkdir -p apps/web/src/components
mkdir -p apps/web/src/store
mkdir -p apps/web/src/hooks
mkdir -p apps/web/src/utils
mkdir -p apps/web/src/styles
mkdir -p apps/web/src/tests

# Web root files
touch apps/web/package.json
touch apps/web/tsconfig.json
touch apps/web/vite.config.ts
touch apps/web/index.html
touch apps/web/playwright.config.ts
touch apps/web/.env.example

# Web src files
touch apps/web/src/main.tsx
touch apps/web/src/App.tsx

# Web routes
touch apps/web/src/routes/index.tsx
touch apps/web/src/routes/ProtectedRoute.tsx

# Web API layer
touch apps/web/src/api/client.ts
touch apps/web/src/api/auth.api.ts
touch apps/web/src/api/tasks.api.ts
touch apps/web/src/api/categories.api.ts

# Web features - auth
touch apps/web/src/features/auth/LoginPage.tsx
touch apps/web/src/features/auth/RegisterPage.tsx

# Web features - dashboard
touch apps/web/src/features/dashboard/DashboardPage.tsx

# Web features - tasks
touch apps/web/src/features/tasks/TasksPage.tsx
touch apps/web/src/features/tasks/TaskDrawer.tsx
touch apps/web/src/features/tasks/FiltersBar.tsx

# Web features - categories
touch apps/web/src/features/categories/CategoriesPage.tsx

# Web components
touch apps/web/src/components/Button.tsx
touch apps/web/src/components/Input.tsx
touch apps/web/src/components/Modal.tsx
touch apps/web/src/components/Toaster.tsx

# Web store
touch apps/web/src/store/auth.store.ts

# Web hooks
touch apps/web/src/hooks/useSocket.ts

# Web utils
touch apps/web/src/utils/zod-helpers.ts
touch apps/web/src/utils/date.ts

# Web styles
touch apps/web/src/styles/tailwind.css

# Web tests
touch apps/web/src/tests/setup.ts
touch apps/web/src/tests/auth.e2e.spec.ts

echo "✅ Taskverse project structure generated successfully!"
echo ""
echo "📁 Project structure created in: $(pwd)"
echo ""
echo "📋 Next steps:"
echo "   1. cd $PROJECT_NAME"
echo "   2. Initialize git repository: git init"
echo "   3. Start implementing individual files"
echo "   4. Set up package.json workspaces configuration"
echo ""
echo "🎯 Happy coding!"