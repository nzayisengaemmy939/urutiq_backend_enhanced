import { prisma } from './prisma.js';
export function mountCategoryRoutes(router) {
    // Get all categories
    router.get('/categories', async (req, res) => {
        const companyId = String(req.query.companyId || '');
        try {
            const categories = await prisma.category.findMany({
                where: {
                    tenantId: req.tenantId,
                    ...(companyId && companyId !== '' ? { companyId } : {})
                },
                include: {
                    _count: {
                        select: {
                            products: true
                        }
                    }
                },
                orderBy: {
                    name: 'asc'
                }
            });
            res.json(categories);
        }
        catch (error) {
            console.error('Error fetching categories:', error);
            res.status(500).json({ error: 'Failed to fetch categories' });
        }
    });
    // Get category by ID
    router.get('/categories/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const category = await prisma.category.findFirst({
                where: {
                    id,
                    tenantId: req.tenantId
                },
                include: {
                    products: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                            stockQuantity: true,
                            unitPrice: true,
                            status: true
                        }
                    },
                    _count: {
                        select: {
                            products: true
                        }
                    }
                }
            });
            if (!category) {
                return res.status(404).json({ error: 'Category not found' });
            }
            res.json(category);
        }
        catch (error) {
            console.error('Error fetching category:', error);
            res.status(500).json({ error: 'Failed to fetch category' });
        }
    });
    // Create new category
    router.post('/categories', async (req, res) => {
        const { name, description, color, icon, parentId, companyId } = req.body;
        try {
            if (!name) {
                return res.status(400).json({ error: 'Category name is required' });
            }
            // Check if category already exists
            const existingCategory = await prisma.category.findFirst({
                where: {
                    name,
                    tenantId: req.tenantId,
                    companyId: companyId || undefined
                }
            });
            if (existingCategory) {
                return res.status(409).json({ error: 'Category with this name already exists' });
            }
            const category = await prisma.category.create({
                data: {
                    name,
                    description: description || null,
                    color: color || null,
                    icon: icon || null,
                    parentId: parentId || null,
                    companyId: companyId || null,
                    tenantId: req.tenantId,
                    isActive: true
                },
                include: {
                    _count: {
                        select: {
                            products: true
                        }
                    }
                }
            });
            res.status(201).json(category);
        }
        catch (error) {
            console.error('Error creating category:', error);
            res.status(500).json({ error: 'Failed to create category' });
        }
    });
    // Update category
    router.put('/categories/:id', async (req, res) => {
        const { id } = req.params;
        const { name, description, color, icon, parentId, isActive } = req.body;
        try {
            // Check if category exists
            const existingCategory = await prisma.category.findFirst({
                where: {
                    id,
                    tenantId: req.tenantId
                }
            });
            if (!existingCategory) {
                return res.status(404).json({ error: 'Category not found' });
            }
            // Check if name is unique (excluding current category)
            if (name && name !== existingCategory.name) {
                const duplicateCategory = await prisma.category.findFirst({
                    where: {
                        name,
                        tenantId: req.tenantId,
                        companyId: existingCategory.companyId,
                        id: { not: id }
                    }
                });
                if (duplicateCategory) {
                    return res.status(409).json({ error: 'Category with this name already exists' });
                }
            }
            const updatedCategory = await prisma.category.update({
                where: { id },
                data: {
                    ...(name && { name }),
                    ...(description !== undefined && { description }),
                    ...(color !== undefined && { color }),
                    ...(icon !== undefined && { icon }),
                    ...(parentId !== undefined && { parentId }),
                    ...(isActive !== undefined && { isActive })
                },
                include: {
                    _count: {
                        select: {
                            products: true
                        }
                    }
                }
            });
            res.json(updatedCategory);
        }
        catch (error) {
            console.error('Error updating category:', error);
            res.status(500).json({ error: 'Failed to update category' });
        }
    });
    // Delete category
    router.delete('/categories/:id', async (req, res) => {
        const { id } = req.params;
        try {
            // Check if category exists
            const existingCategory = await prisma.category.findFirst({
                where: {
                    id,
                    tenantId: req.tenantId
                },
                include: {
                    _count: {
                        select: {
                            products: true
                        }
                    }
                }
            });
            if (!existingCategory) {
                return res.status(404).json({ error: 'Category not found' });
            }
            // Check if category has products
            if (existingCategory._count.products > 0) {
                return res.status(400).json({
                    error: 'Cannot delete category with existing products. Please reassign products first.'
                });
            }
            await prisma.category.delete({
                where: { id }
            });
            res.json({ message: 'Category deleted successfully' });
        }
        catch (error) {
            console.error('Error deleting category:', error);
            res.status(500).json({ error: 'Failed to delete category' });
        }
    });
    // Get category hierarchy (nested categories)
    router.get('/categories/hierarchy', async (req, res) => {
        const companyId = String(req.query.companyId || '');
        try {
            // Get all categories
            const allCategories = await prisma.category.findMany({
                where: {
                    tenantId: req.tenantId,
                    ...(companyId && companyId !== '' ? { companyId } : {}),
                    isActive: true
                },
                include: {
                    _count: {
                        select: {
                            products: true
                        }
                    }
                },
                orderBy: {
                    name: 'asc'
                }
            });
            // Build hierarchy
            const categoryMap = new Map();
            const rootCategories = [];
            // First pass: create map of all categories
            allCategories.forEach(category => {
                categoryMap.set(category.id, {
                    ...category,
                    children: []
                });
            });
            // Second pass: build hierarchy
            allCategories.forEach(category => {
                const categoryWithChildren = categoryMap.get(category.id);
                if (category.parentId) {
                    const parent = categoryMap.get(category.parentId);
                    if (parent) {
                        parent.children.push(categoryWithChildren);
                    }
                    else {
                        // Parent not found, treat as root
                        rootCategories.push(categoryWithChildren);
                    }
                }
                else {
                    rootCategories.push(categoryWithChildren);
                }
            });
            res.json(rootCategories);
        }
        catch (error) {
            console.error('Error fetching category hierarchy:', error);
            res.status(500).json({ error: 'Failed to fetch category hierarchy' });
        }
    });
}
