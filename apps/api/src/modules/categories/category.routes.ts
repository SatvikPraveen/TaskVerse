// apps/api/src/modules/categories/category.routes.ts
import { Router } from 'express';

import { authenticateToken } from '@/middleware/auth';

import { CategoryController } from './category.controller';

const router = Router();

// All category routes require authentication
router.use(authenticateToken);

router.get('/', CategoryController.getCategories);
router.get('/stats', CategoryController.getCategoryStats);
router.post('/', CategoryController.createCategory);
router.put('/reorder', CategoryController.reorderCategories);
router.get('/:categoryId', CategoryController.getCategoryById);
router.put('/:categoryId', CategoryController.updateCategory);
router.delete('/:categoryId', CategoryController.deleteCategory);

export default router;
