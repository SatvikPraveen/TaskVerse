# File: docs/api-contract.md

# TaskVerse API Contract

Base URL: `http://localhost:3001/api/v1`

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Endpoints

### Authentication

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

#### POST /auth/login
Authenticate user and return tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

#### POST /auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Response (200):**
```json
{
  "accessToken": "new_jwt_access_token"
}
```

#### POST /auth/logout
Invalidate refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

### Users

#### GET /users/profile
Get current user profile. **[Protected]**

**Response (200):**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2023-01-01T00:00:00Z",
  "updatedAt": "2023-01-01T00:00:00Z"
}
```

#### PUT /users/profile
Update current user profile. **[Protected]**

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "newemail@example.com"
}
```

### Categories

#### GET /categories
Get all categories for the current user. **[Protected]**

**Query Parameters:**
- `limit` (optional): Number of categories to return (default: 50)
- `offset` (optional): Number of categories to skip (default: 0)

**Response (200):**
```json
{
  "categories": [
    {
      "id": "category_id",
      "name": "Personal",
      "color": "#FF6B6B",
      "userId": "user_id",
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2023-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

#### POST /categories
Create a new category. **[Protected]**

**Request Body:**
```json
{
  "name": "Work",
  "color": "#4ECDC4"
}
```

#### PUT /categories/:id
Update a category. **[Protected]**

**Request Body:**
```json
{
  "name": "Updated Work",
  "color": "#45B7B8"
}
```

#### DELETE /categories/:id
Delete a category. **[Protected]**

**Response (200):**
```json
{
  "message": "Category deleted successfully"
}
```

### Tasks

#### GET /tasks
Get all tasks for the current user. **[Protected]**

**Query Parameters:**
- `limit` (optional): Number of tasks to return (default: 20)
- `offset` (optional): Number of tasks to skip (default: 0)
- `status` (optional): Filter by status (`pending`, `completed`)
- `priority` (optional): Filter by priority (`low`, `medium`, `high`)
- `categoryId` (optional): Filter by category ID
- `search` (optional): Search in title and description
- `sortBy` (optional): Sort field (`createdAt`, `updatedAt`, `dueDate`, `priority`)
- `sortOrder` (optional): Sort order (`asc`, `desc`, default: `desc`)

**Response (200):**
```json
{
  "tasks": [
    {
      "id": "task_id",
      "title": "Complete project",
      "description": "Finish the task management app",
      "status": "pending",
      "priority": "high",
      "dueDate": "2023-12-31T23:59:59Z",
      "categoryId": "category_id",
      "category": {
        "id": "category_id",
        "name": "Work",
        "color": "#4ECDC4"
      },
      "attachments": [
        {
          "id": "attachment_id",
          "filename": "document.pdf",
          "url": "https://s3.bucket.com/file.pdf",
          "size": 1024000,
          "mimeType": "application/pdf"
        }
      ],
      "userId": "user_id",
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2023-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

#### POST /tasks
Create a new task. **[Protected]**

**Request Body:**
```json
{
  "title": "New task",
  "description": "Task description",
  "priority": "medium",
  "dueDate": "2023-12-31T23:59:59Z",
  "categoryId": "category_id"
}
```

#### GET /tasks/:id
Get a specific task. **[Protected]**

#### PUT /tasks/:id
Update a task. **[Protected]**

**Request Body:**
```json
{
  "title": "Updated task",
  "description": "Updated description",
  "status": "completed",
  "priority": "high",
  "dueDate": "2024-01-15T23:59:59Z",
  "categoryId": "category_id"
}
```

#### DELETE /tasks/:id
Delete a task. **[Protected]**

### File Uploads

#### POST /uploads/presign
Get presigned URL for file upload. **[Protected]**

**Request Body:**
```json
{
  "filename": "document.pdf",
  "contentType": "application/pdf"
}
```

**Response (200):**
```json
{
  "uploadUrl": "https://s3.bucket.com/presigned-url",
  "fileUrl": "https://s3.bucket.com/final-url",
  "fileId": "generated_file_id"
}
```

#### POST /tasks/:id/attachments
Add attachment to task. **[Protected]**

**Request Body:**
```json
{
  "fileId": "generated_file_id",
  "filename": "document.pdf",
  "size": 1024000,
  "mimeType": "application/pdf"
}
```

## WebSocket Events

Connect to: `ws://localhost:3001`

### Authentication
Send authentication token after connection:
```json
{
  "type": "auth",
  "token": "jwt_access_token"
}
```

### Task Events

#### task:created
Emitted when a task is created.
```json
{
  "type": "task:created",
  "data": { /* task object */ }
}
```

#### task:updated
Emitted when a task is updated.
```json
{
  "type": "task:updated", 
  "data": { /* updated task object */ }
}
```

#### task:deleted
Emitted when a task is deleted.
```json
{
  "type": "task:deleted",
  "data": {
    "id": "task_id"
  }
}
```

## Error Responses

All error responses follow this format:

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {} // Optional additional details
  }
}
```

### Common HTTP Status Codes:
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Too Many Requests
- `500` - Internal Server Error