.
├── .editorconfig
├── .github
│   └── workflows
│       ├── ci.yml
│       └── e2e.yml
├── .gitignore
├── .prettierrc
├── apps
│   ├── api
│   │   ├── .env.example
│   │   ├── Dockerfile
│   │   ├── jest.config.cjs
│   │   ├── package.json
│   │   ├── src
│   │   │   ├── app.ts
│   │   │   ├── config
│   │   │   │   ├── db.ts
│   │   │   │   ├── env.ts
│   │   │   │   └── logger.ts
│   │   │   ├── middleware
│   │   │   │   ├── auth.ts
│   │   │   │   ├── cors.ts
│   │   │   │   ├── error.ts
│   │   │   │   └── rateLimit.ts
│   │   │   ├── modules
│   │   │   │   ├── auth
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.model.ts
│   │   │   │   │   ├── auth.routes.ts
│   │   │   │   │   └── auth.service.ts
│   │   │   │   ├── categories
│   │   │   │   │   ├── category.controller.ts
│   │   │   │   │   ├── category.model.ts
│   │   │   │   │   └── category.routes.ts
│   │   │   │   ├── tasks
│   │   │   │   │   ├── task.controller.ts
│   │   │   │   │   ├── task.model.ts
│   │   │   │   │   └── task.routes.ts
│   │   │   │   ├── uploads
│   │   │   │   │   ├── s3.client.ts
│   │   │   │   │   ├── upload.controller.ts
│   │   │   │   │   └── upload.routes.ts
│   │   │   │   └── users
│   │   │   │       ├── user.controller.ts
│   │   │   │       ├── user.model.ts
│   │   │   │       └── user.routes.ts
│   │   │   ├── server.ts
│   │   │   ├── sockets
│   │   │   │   ├── init.ts
│   │   │   │   └── tasks.nsp.ts
│   │   │   ├── tests
│   │   │   │   ├── auth.int.test.ts
│   │   │   │   ├── categories.int.test.ts
│   │   │   │   ├── setup.ts
│   │   │   │   └── tasks.int.test.ts
│   │   │   └── utils
│   │   │       ├── jwt.ts
│   │   │       ├── pagination.ts
│   │   │       └── passwords.ts
│   │   └── tsconfig.json
│   └── web
│       ├── .env.example
│       ├── index.html
│       ├── package.json
│       ├── playwright.config.ts
│       ├── postcss.config.js
│       ├── public
│       ├── src
│       │   ├── api
│       │   │   ├── auth.api.ts
│       │   │   ├── categories.api.ts
│       │   │   ├── client.ts
│       │   │   └── tasks.api.ts
│       │   ├── App.tsx
│       │   ├── components
│       │   │   ├── Button.tsx
│       │   │   ├── Input.tsx
│       │   │   ├── Layout.tsx
│       │   │   ├── Modal.tsx
│       │   │   └── Toaster.tsx
│       │   ├── features
│       │   │   ├── auth
│       │   │   │   ├── LoginPage.tsx
│       │   │   │   └── RegisterPage.tsx
│       │   │   ├── categories
│       │   │   │   ├── CategoriesPage.tsx
│       │   │   │   └── CategoryForm.tsx
│       │   │   ├── dashboard
│       │   │   │   ├── charts
│       │   │   │   │   ├── CategoryDistribution.tsx
│       │   │   │   │   └── TaskOverview.tsx
│       │   │   │   └── DashboardPage.tsx
│       │   │   └── tasks
│       │   │       ├── CreateTasksForm.tsx
│       │   │       ├── FiltersBar.tsx
│       │   │       ├── TaskCard.tsx
│       │   │       ├── TaskDrawer.tsx
│       │   │       └── TasksPage.tsx
│       │   ├── hooks
│       │   │   └── useSocket.ts
│       │   ├── main.tsx
│       │   ├── routes
│       │   │   ├── index.tsx
│       │   │   └── ProtectedRoute.tsx
│       │   ├── store
│       │   │   └── auth.store.ts
│       │   ├── styles
│       │   │   └── tailwind.css
│       │   ├── tests
│       │   │   ├── auth.e2e.spec.ts
│       │   │   └── setup.ts
│       │   └── utils
│       │       ├── date.ts
│       │       └── zod-helpers.ts
│       ├── tailwind.config.js
│       ├── tsconfig.json
│       └── vite.config.ts
├── docker
│   ├── .env.example
│   └── docker-compose.yml
├── docs
│   ├── api-contract.md
│   └── architecture-diagram.svg
├── eslint.config.cjs
├── generate-taskverse-structure.sh
├── infra
│   └── README.md
├── package.json
├── packages
│   ├── eslint-config
│   │   ├── index.cjs
│   │   └── package.json
│   ├── types
│   │   ├── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── zod
│   │       ├── auth.schema.ts
│   │       ├── category.schema.ts
│   │       └── task.schema.ts
│   └── utils
│       ├── date.ts
│       ├── index.ts
│       ├── package.json
│       └── tsconfig.json
├── PROJECT_STRUCTURE.md
├── README.md
├── tsconfig.base.json
└── turbo.json

42 directories, 108 files
