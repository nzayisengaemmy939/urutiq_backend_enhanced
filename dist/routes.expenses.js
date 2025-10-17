import { prisma } from './prisma.js';
import { validateBody } from './validate.js';
import { z } from 'zod';
import { expenseJournalIntegration } from './services/expense-journal-integration.js';
import { smartGLAccountAssignment } from './services/smart-gl-account-assignment.js';
import { seniorAccountCodeManager } from './services/senior-account-code-manager.js';
// Validation schemas
const expenseSchemas = {
    category: z.object({
        companyId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        parentId: z.string().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
        taxTreatment: z.enum(['deductible', 'non-deductible', 'partially_deductible']).optional(),
        approvalThreshold: z.number().nonnegative().optional()
    }),
    budget: z.object({
        companyId: z.string(),
        categoryId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        period: z.enum(['monthly', 'quarterly', 'yearly']),
        startDate: z.string().min(1),
        endDate: z.string().min(1),
        amount: z.number().positive(),
        alertThreshold: z.number().min(0).max(100).optional()
    }),
    rule: z.object({
        companyId: z.string(),
        categoryId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        ruleType: z.enum(['amount_limit', 'vendor_restriction', 'approval_required']),
        conditions: z.string(), // JSON string
        priority: z.number().int().min(0).default(0)
    })
};
export function mountExpenseRoutes(router) {
    // Helper to adjust budgets for an expense based on category and date
    async function adjustBudgetsForExpense(opts) {
        const { tenantId, companyId, categoryId, expenseDate, amount } = opts;
        try {
            // Find all active budgets for this category and date range
            const budgets = await prisma.budget.findMany({
                where: {
                    tenantId,
                    companyId,
                    categoryId,
                    isActive: true,
                    startDate: { lte: expenseDate },
                    endDate: { gte: expenseDate }
                }
            });
            // If no budgets found, nothing to do
            if (budgets.length === 0) {
                console.log(`No active budgets found for category ${categoryId} on ${expenseDate}`);
                return;
            }
            // Update each matching budget
            const updates = budgets.map(budget => prisma.budget.update({
                where: { id: budget.id },
                data: {
                    spentAmount: {
                        increment: amount
                    }
                }
            }));
            await Promise.all(updates);
            console.log(`Updated ${updates.length} budgets for category ${categoryId} by ${amount}`);
        }
        catch (error) {
            console.error('Error adjusting budgets for expense:', error);
            throw new Error('Failed to update budget allocations');
        }
    }
    // Helper to adjust SPECIFIC budget when expense affects it (SENIOR SOLUTION)
    async function adjustSpecificBudget(opts) {
        const { budgetId, amount } = opts;
        if (!budgetId || budgetId === 'auto')
            return;
        // Update ONLY the selected budget
        await prisma.budget.update({
            where: { id: budgetId },
            data: {
                spentAmount: { increment: amount }
            }
        });
    }
    // Helper to validate SPECIFIC budget has enough funds AND date range
    async function validateSpecificBudget(opts) {
        const { budgetId, expenseAmount, expenseDate } = opts;
        if (!budgetId || budgetId === 'auto') {
            // For auto-select, use the old logic as fallback
            return { available: 999999, budgetName: 'Auto-selected' };
        }
        const budget = await prisma.budget.findUnique({
            where: { id: budgetId },
            select: {
                name: true,
                amount: true,
                spentAmount: true,
                isActive: true,
                startDate: true,
                endDate: true,
                period: true
            }
        });
        if (!budget) {
            console.warn(`Budget not found: ${budgetId}, skipping budget validation`);
            return { available: 999999, budgetName: 'Budget not found - skipping validation' };
        }
        if (!budget.isActive) {
            throw new Error(`Budget is not active: ${budget.name}`);
        }
        // SENIOR VALIDATION: Check if expense date is within budget period
        if (expenseDate) {
            const budgetStart = new Date(budget.startDate);
            const budgetEnd = new Date(budget.endDate);
            if (expenseDate < budgetStart || expenseDate > budgetEnd) {
                throw new Error(`Expense date ${expenseDate.toISOString().split('T')[0]} is outside budget period. ` +
                    `Budget "${budget.name}" covers ${budgetStart.toISOString().split('T')[0]} to ${budgetEnd.toISOString().split('T')[0]}`);
            }
        }
        const amount = typeof budget.amount === 'object' ? Number(budget.amount) : budget.amount;
        const spentAmount = typeof budget.spentAmount === 'object' ? Number(budget.spentAmount) : budget.spentAmount;
        const available = amount - spentAmount;
        return {
            available,
            budgetName: budget.name,
            totalAmount: amount,
            spentAmount,
            startDate: budget.startDate,
            endDate: budget.endDate,
            period: budget.period
        };
    }
    // Helper to get available budget for a category and date range
    async function getAvailableBudget(opts) {
        const { tenantId, companyId, categoryId, expenseDate } = opts;
        // Find active budgets for this category and date
        const budgets = await prisma.budget.findMany({
            where: {
                tenantId,
                companyId,
                categoryId: categoryId || undefined,
                isActive: true,
                startDate: { lte: expenseDate || new Date() },
                endDate: { gte: expenseDate || new Date() }
            }
        });
        // Return the first matching budget with available amount
        for (const budget of budgets) {
            // Convert Decimal to number for arithmetic operations
            const amount = typeof budget.amount === 'object' ? Number(budget.amount) : budget.amount;
            const spentAmount = typeof budget.spentAmount === 'object' ? Number(budget.spentAmount) : budget.spentAmount;
            const available = amount - spentAmount;
            if (available > 0) {
                return { budgetId: budget.id, available };
            }
        }
        return { budgetId: null, available: 0 };
    }
    // Create default expense categories for a company
    router.post('/expense-categories/seed/:companyId', async (req, res) => {
        const { companyId } = req.params;
        const defaultCategories = [
            { name: 'Office Supplies', description: 'General office supplies and materials', taxTreatment: 'deductible' },
            { name: 'Travel & Entertainment', description: 'Business travel and entertainment expenses', taxTreatment: 'deductible' },
            { name: 'Marketing & Advertising', description: 'Marketing and advertising expenses', taxTreatment: 'deductible' },
            { name: 'Professional Services', description: 'Legal, accounting, and consulting fees', taxTreatment: 'deductible' },
            { name: 'Technology & Software', description: 'Software licenses and technology expenses', taxTreatment: 'deductible' },
            { name: 'Utilities', description: 'Electricity, water, internet, and phone bills', taxTreatment: 'deductible' },
            { name: 'Rent & Facilities', description: 'Office rent and facility maintenance', taxTreatment: 'deductible' },
            { name: 'General Budget', description: 'Default budget category', taxTreatment: 'deductible' }
        ];
        const createdCategories = [];
        for (const category of defaultCategories) {
            const existing = await prisma.expenseCategory.findFirst({
                where: {
                    tenantId: req.tenantId,
                    companyId,
                    name: category.name
                }
            });
            if (!existing) {
                const newCategory = await prisma.expenseCategory.create({
                    data: {
                        tenantId: req.tenantId,
                        companyId,
                        name: category.name,
                        description: category.description,
                        isActive: true,
                        taxTreatment: category.taxTreatment
                    }
                });
                createdCategories.push(newCategory);
            }
        }
        res.json({
            message: `Created ${createdCategories.length} default categories`,
            categories: createdCategories
        });
    });
    // Get all expense categories
    router.get('/expense-categories', async (req, res) => {
        // Prefer explicit query param, fallback to header for convenience
        const companyId = String(req.query.companyId || req.header('x-company-id') || '');
        const includeInactive = req.query.includeInactive === 'true';
        try {
            if (!companyId) {
                return res.status(400).json({ error: 'company_id_required', message: 'companyId query param or x-company-id header is required' });
            }
            const where = {
                tenantId: req.tenantId,
                companyId,
                isActive: includeInactive ? undefined : true
            };
            const categories = await prisma.expenseCategory.findMany({
                where,
                include: {
                    parent: true,
                    children: true,
                    budgets: { where: { isActive: true } },
                    expenseRules: { where: { isActive: true } }
                },
                orderBy: [
                    { parentId: 'asc' },
                    { name: 'asc' }
                ]
            });
            // Build hierarchical structure
            const buildHierarchy = (items, parentId = null) => {
                return items
                    .filter(item => item.parentId === parentId)
                    .map(item => ({
                    ...item,
                    children: buildHierarchy(items, item.id)
                }));
            };
            const hierarchicalCategories = buildHierarchy(categories);
            res.json(hierarchicalCategories);
        }
        catch (error) {
            console.error('Error fetching expense categories:', error);
            res.status(500).json({ error: 'Failed to fetch expense categories' });
        }
    });
    // Get single expense category
    router.get('/expense-categories/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const category = await prisma.expenseCategory.findFirst({
                where: {
                    id,
                    tenantId: req.tenantId
                },
                include: {
                    parent: true,
                    children: true,
                    budgets: true,
                    expenseRules: true
                }
            });
            if (!category) {
                return res.status(404).json({ error: 'Expense category not found' });
            }
            res.json(category);
        }
        catch (error) {
            console.error('Error fetching expense category:', error);
            res.status(500).json({ error: 'Failed to fetch expense category' });
        }
    });
    // Create expense category
    router.post('/expense-categories', validateBody(expenseSchemas.category), async (req, res) => {
        const data = req.body;
        try {
            const category = await prisma.expenseCategory.create({
                data: {
                    tenantId: req.tenantId,
                    companyId: data.companyId,
                    name: data.name,
                    description: data.description,
                    parentId: data.parentId,
                    color: data.color,
                    icon: data.icon,
                    taxTreatment: data.taxTreatment,
                    approvalThreshold: data.approvalThreshold
                },
                include: {
                    parent: true,
                    children: true
                }
            });
            res.status(201).json(category);
        }
        catch (error) {
            console.error('Error creating expense category:', error);
            res.status(500).json({ error: 'Failed to create expense category' });
        }
    });
    // Update expense category
    router.put('/expense-categories/:id', validateBody(expenseSchemas.category), async (req, res) => {
        const { id } = req.params;
        const data = req.body;
        try {
            // Validate parentId if provided
            if (data.parentId) {
                // Check if parent category exists and belongs to same tenant/company
                const parentCategory = await prisma.expenseCategory.findFirst({
                    where: {
                        id: data.parentId,
                        tenantId: req.tenantId,
                        companyId: data.companyId
                    }
                });
                if (!parentCategory) {
                    return res.status(400).json({ error: 'Parent category not found' });
                }
                // Prevent circular reference (category cannot be its own parent)
                if (data.parentId === id) {
                    return res.status(400).json({ error: 'Category cannot be its own parent' });
                }
                // Check for circular reference in hierarchy
                const checkCircularReference = async (categoryId, targetParentId) => {
                    const category = await prisma.expenseCategory.findFirst({
                        where: { id: categoryId, tenantId: req.tenantId }
                    });
                    if (!category)
                        return false;
                    if (category.parentId === targetParentId)
                        return true;
                    if (!category.parentId)
                        return false;
                    return await checkCircularReference(category.parentId, targetParentId);
                };
                const hasCircularReference = await checkCircularReference(data.parentId, id);
                if (hasCircularReference) {
                    return res.status(400).json({ error: 'Circular reference detected in category hierarchy' });
                }
            }
            const category = await prisma.expenseCategory.update({
                where: {
                    id,
                    tenantId: req.tenantId // Ensure tenant isolation
                },
                data: {
                    name: data.name,
                    description: data.description,
                    parentId: data.parentId || null, // Convert undefined to null
                    color: data.color,
                    icon: data.icon,
                    taxTreatment: data.taxTreatment,
                    approvalThreshold: data.approvalThreshold
                },
                include: {
                    parent: true,
                    children: true
                }
            });
            res.json(category);
        }
        catch (error) {
            console.error('Error updating expense category:', error);
            // Handle specific Prisma errors
            if (error.code === 'P2003') {
                return res.status(400).json({ error: 'Invalid parent category reference' });
            }
            if (error.code === 'P2025') {
                return res.status(404).json({ error: 'Category not found' });
            }
            res.status(500).json({ error: 'Failed to update expense category' });
        }
    });
    // Delete expense category
    router.delete('/expense-categories/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const category = await prisma.expenseCategory.findFirst({
                where: { id, tenantId: req.tenantId },
                include: { children: true, budgets: true }
            });
            if (!category) {
                return res.status(404).json({ error: 'Expense category not found' });
            }
            if (category.children.length > 0) {
                return res.status(400).json({ error: 'Cannot delete category with subcategories' });
            }
            if (category.budgets.length > 0) {
                return res.status(400).json({ error: 'Cannot delete category with active budgets' });
            }
            await prisma.expenseCategory.delete({
                where: { id }
            });
            res.json({ message: 'Expense category deleted successfully' });
        }
        catch (error) {
            console.error('Error deleting expense category:', error);
            res.status(500).json({ error: 'Failed to delete expense category' });
        }
    });
    // Get available budgets for expense creation
    router.get('/budgets/available', async (req, res) => {
        const companyId = String(req.query.companyId || '');
        const categoryId = req.query.categoryId;
        const expenseDate = req.query.expenseDate;
        const expenseAmount = Number(req.query.expenseAmount || 0);
        try {
            if (!categoryId || !expenseDate) {
                return res.status(400).json({ error: 'categoryId and expenseDate are required' });
            }
            const date = new Date(expenseDate);
            const budgets = await prisma.budget.findMany({
                where: {
                    tenantId: req.tenantId,
                    companyId: companyId || undefined,
                    categoryId,
                    isActive: true,
                    startDate: { lte: date },
                    endDate: { gte: date }
                },
                include: {
                    category: { select: { name: true } }
                },
                orderBy: [
                    { startDate: 'desc' },
                    { name: 'asc' }
                ]
            });
            // Calculate availability and add metadata
            const budgetOptions = budgets.map(budget => {
                const amount = typeof budget.amount === 'object' ? Number(budget.amount) : budget.amount;
                const spentAmount = typeof budget.spentAmount === 'object' ? Number(budget.spentAmount) : budget.spentAmount;
                const available = amount - spentAmount;
                const utilization = amount > 0 ? Math.round((spentAmount / amount) * 100) : 0;
                const canAfford = available >= expenseAmount;
                return {
                    id: budget.id,
                    name: budget.name,
                    period: budget.period,
                    amount,
                    spentAmount,
                    available,
                    utilization,
                    canAfford,
                    startDate: budget.startDate,
                    endDate: budget.endDate,
                    category: budget.category?.name,
                    status: canAfford ? 'available' : 'insufficient',
                    displayText: `${budget.name} - $${available.toLocaleString()} available (${utilization}% used)`
                };
            });
            res.json({
                budgets: budgetOptions,
                hasMultiple: budgetOptions.length > 1,
                recommended: budgetOptions.find(b => b.canAfford) || budgetOptions[0]
            });
        }
        catch (error) {
            console.error('Error fetching available budgets:', error);
            res.status(500).json({ error: 'Failed to fetch available budgets' });
        }
    });
    // Get budgets
    router.get('/budgets', async (req, res) => {
        const companyId = String(req.query.companyId || '');
        const categoryId = req.query.categoryId || undefined;
        const isActive = req.query.isActive === 'true';
        try {
            const where = {
                tenantId: req.tenantId,
                companyId,
                categoryId: categoryId || undefined,
                isActive: isActive ? true : undefined
            };
            const budgets = await prisma.budget.findMany({
                where,
                include: {
                    category: true
                },
                orderBy: [
                    { startDate: 'desc' },
                    { name: 'asc' }
                ]
            });
            res.json(budgets);
        }
        catch (error) {
            console.error('Error fetching budgets:', error);
            res.status(500).json({ error: 'Failed to fetch budgets' });
        }
    });
    // Budget analytics
    router.get('/budgets/analytics', async (req, res) => {
        const companyId = String(req.query.companyId || '');
        try {
            const where = { tenantId: req.tenantId, companyId: companyId || undefined };
            const budgets = await prisma.budget.findMany({ where });
            const totalCategories = await prisma.expenseCategory.count({
                where: {
                    tenantId: req.tenantId,
                    companyId: companyId || undefined,
                    isActive: true,
                    parentId: null // Only count top-level categories (parents) to match hierarchical display
                }
            });
            const activeBudgets = budgets.filter(b => b.isActive).length;
            const totalBudgetedAmount = budgets.reduce((s, b) => s + Number(b.amount), 0);
            // Compute spent from actual expenses for accuracy, ignoring draft
            const expenseWhere = {
                tenantId: req.tenantId,
                companyId: companyId || undefined,
                status: { not: 'draft' }
            };
            const expenseAggregate = await prisma.expense.aggregate({
                _sum: { totalAmount: true },
                where: expenseWhere
            });
            const totalSpentAmount = Number(expenseAggregate._sum.totalAmount || 0);
            res.json({ totalCategories, activeBudgets, totalBudgetedAmount, totalSpentAmount });
        }
        catch (error) {
            console.error('Error fetching budget analytics:', error);
            res.status(500).json({ error: 'Failed to fetch budget analytics' });
        }
    });
    // Recalculate budgets' spent amounts from expenses (idempotent, accurate)
    router.post('/budgets/recalculate-spent', async (req, res) => {
        const companyId = String(req.body?.companyId || req.query.companyId || '');
        try {
            // Load budgets in scope
            const budgets = await prisma.budget.findMany({
                where: {
                    tenantId: req.tenantId,
                    companyId: companyId || undefined
                },
                select: { id: true, companyId: true, categoryId: true, startDate: true, endDate: true }
            });
            // For performance, aggregate expenses once by category and date
            const expenses = await prisma.expense.findMany({
                where: {
                    tenantId: req.tenantId,
                    companyId: companyId || undefined,
                    status: { not: 'draft' }
                },
                select: { categoryId: true, totalAmount: true, amount: true, expenseDate: true }
            });
            // Pre-bucket expenses by category for quick lookups
            const byCategory = {};
            for (const e of expenses) {
                if (!e.categoryId)
                    continue;
                const key = e.categoryId;
                const amt = Number(e.totalAmount || e.amount || 0);
                const dateVal = new Date(e.expenseDate);
                (byCategory[key] ||= []).push({ amount: amt, date: dateVal });
            }
            // Compute spent per budget and batch updates
            const updates = [];
            for (const b of budgets) {
                const bucket = byCategory[b.categoryId] || [];
                const spent = bucket
                    .filter(x => x.date >= b.startDate && x.date <= b.endDate)
                    .reduce((s, x) => s + x.amount, 0);
                updates.push(prisma.budget.update({ where: { id: b.id }, data: { spentAmount: spent } }));
            }
            await Promise.all(updates);
            res.json({ ok: true, updated: updates.length });
        }
        catch (error) {
            console.error('Error recalculating budget spent:', error);
            res.status(500).json({ error: 'Failed to recalculate budget spent' });
        }
    });
    // Get single budget
    router.get('/budgets/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const budget = await prisma.budget.findFirst({
                where: {
                    id,
                    tenantId: req.tenantId
                },
                include: {
                    category: true
                }
            });
            if (!budget) {
                return res.status(404).json({ error: 'Budget not found' });
            }
            res.json(budget);
        }
        catch (error) {
            console.error('Error fetching budget:', error);
            res.status(500).json({ error: 'Failed to fetch budget' });
        }
    });
    // Create budget
    router.post('/budgets', validateBody(expenseSchemas.budget), async (req, res) => {
        const data = req.body;
        try {
            const budget = await prisma.budget.create({
                data: {
                    tenantId: req.tenantId,
                    companyId: data.companyId,
                    categoryId: data.categoryId,
                    name: data.name,
                    description: data.description,
                    period: data.period,
                    startDate: new Date(data.startDate),
                    endDate: new Date(data.endDate),
                    amount: data.amount,
                    alertThreshold: data.alertThreshold
                },
                include: {
                    category: true
                }
            });
            res.status(201).json(budget);
        }
        catch (error) {
            console.error('Error creating budget:', error);
            res.status(500).json({ error: 'Failed to create budget' });
        }
    });
    // Update budget
    router.put('/budgets/:id', validateBody(expenseSchemas.budget), async (req, res) => {
        const { id } = req.params;
        const data = req.body;
        try {
            const budget = await prisma.budget.update({
                where: { id },
                data: {
                    categoryId: data.categoryId,
                    name: data.name,
                    description: data.description,
                    period: data.period,
                    startDate: new Date(data.startDate),
                    endDate: new Date(data.endDate),
                    amount: data.amount,
                    alertThreshold: data.alertThreshold
                },
                include: {
                    category: true
                }
            });
            res.json(budget);
        }
        catch (error) {
            console.error('Error updating budget:', error);
            res.status(500).json({ error: 'Failed to update budget' });
        }
    });
    // Delete budget
    router.delete('/budgets/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const budget = await prisma.budget.findFirst({
                where: { id, tenantId: req.tenantId }
            });
            if (!budget) {
                return res.status(404).json({ error: 'Budget not found' });
            }
            await prisma.budget.delete({
                where: { id }
            });
            res.json({ message: 'Budget deleted successfully' });
        }
        catch (error) {
            console.error('Error deleting budget:', error);
            res.status(500).json({ error: 'Failed to delete budget' });
        }
    });
    // Get expense rules
    router.get('/expense-rules', async (req, res) => {
        const companyId = String(req.query.companyId || '');
        const categoryId = req.query.categoryId || undefined;
        const isActive = req.query.isActive === 'true';
        try {
            const where = {
                tenantId: req.tenantId,
                companyId,
                categoryId: categoryId || undefined,
                isActive: isActive ? true : undefined
            };
            const rules = await prisma.expenseRule.findMany({
                where,
                include: {
                    category: true
                },
                orderBy: [
                    { priority: 'desc' },
                    { name: 'asc' }
                ]
            });
            res.json(rules);
        }
        catch (error) {
            console.error('Error fetching expense rules:', error);
            res.status(500).json({ error: 'Failed to fetch expense rules' });
        }
    });
    // Get single expense rule
    router.get('/expense-rules/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const rule = await prisma.expenseRule.findFirst({
                where: {
                    id,
                    tenantId: req.tenantId
                },
                include: {
                    category: true
                }
            });
            if (!rule) {
                return res.status(404).json({ error: 'Expense rule not found' });
            }
            res.json(rule);
        }
        catch (error) {
            console.error('Error fetching expense rule:', error);
            res.status(500).json({ error: 'Failed to fetch expense rule' });
        }
    });
    // Create expense rule
    router.post('/expense-rules', validateBody(expenseSchemas.rule), async (req, res) => {
        const data = req.body;
        try {
            const rule = await prisma.expenseRule.create({
                data: {
                    tenantId: req.tenantId,
                    companyId: data.companyId,
                    categoryId: data.categoryId,
                    name: data.name,
                    description: data.description,
                    ruleType: data.ruleType,
                    conditions: data.conditions,
                    actions: data.actions,
                    priority: data.priority
                },
                include: {
                    category: true
                }
            });
            res.status(201).json(rule);
        }
        catch (error) {
            console.error('Error creating expense rule:', error);
            res.status(500).json({ error: 'Failed to create expense rule' });
        }
    });
    // Update expense rule
    router.put('/expense-rules/:id', validateBody(expenseSchemas.rule), async (req, res) => {
        const { id } = req.params;
        const data = req.body;
        try {
            const rule = await prisma.expenseRule.update({
                where: { id },
                data: {
                    categoryId: data.categoryId,
                    name: data.name,
                    description: data.description,
                    ruleType: data.ruleType,
                    conditions: data.conditions,
                    actions: data.actions,
                    priority: data.priority
                },
                include: {
                    category: true
                }
            });
            res.json(rule);
        }
        catch (error) {
            console.error('Error updating expense rule:', error);
            res.status(500).json({ error: 'Failed to update expense rule' });
        }
    });
    // Delete expense rule
    router.delete('/expense-rules/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const rule = await prisma.expenseRule.findFirst({
                where: { id, tenantId: req.tenantId }
            });
            if (!rule) {
                return res.status(404).json({ error: 'Expense rule not found' });
            }
            await prisma.expenseRule.delete({
                where: { id }
            });
            res.json({ message: 'Expense rule deleted successfully' });
        }
        catch (error) {
            console.error('Error deleting expense rule:', error);
            res.status(500).json({ error: 'Failed to delete expense rule' });
        }
    });
    // Get budget analysis
    router.get('/budget-analysis', async (req, res) => {
        const companyId = String(req.query.companyId || '');
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        try {
            const budgets = await prisma.budget.findMany({
                where: {
                    tenantId: req.tenantId,
                    companyId,
                    isActive: true,
                    startDate: { gte: startDate ? new Date(startDate) : undefined },
                    endDate: { lte: endDate ? new Date(endDate) : undefined }
                },
                include: {
                    category: true
                }
            });
            // Calculate budget vs actual spending
            const analysis = budgets.map(budget => {
                const budgetAmount = Number(budget.amount);
                const spentAmount = Number(budget.spentAmount);
                const variance = budgetAmount - spentAmount;
                const variancePercentage = budgetAmount > 0 ? (variance / budgetAmount) * 100 : 0;
                const utilizationPercentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
                return {
                    ...budget,
                    variance,
                    variancePercentage,
                    utilizationPercentage,
                    status: utilizationPercentage > 100 ? 'over' :
                        utilizationPercentage > 80 ? 'warning' : 'normal'
                };
            });
            res.json(analysis);
        }
        catch (error) {
            console.error('Error fetching budget analysis:', error);
            res.status(500).json({ error: 'Failed to fetch budget analysis' });
        }
    });
    // Get expense category spending summary
    router.get('/expense-summary', async (req, res) => {
        const companyId = String(req.query.companyId || '');
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        try {
            const categories = await prisma.expenseCategory.findMany({
                where: {
                    tenantId: req.tenantId,
                    companyId,
                    isActive: true
                },
                include: {
                    budgets: {
                        where: {
                            isActive: true,
                            startDate: { gte: startDate ? new Date(startDate) : undefined },
                            endDate: { lte: endDate ? new Date(endDate) : undefined }
                        }
                    }
                }
            });
            const summary = categories.map(category => {
                const totalBudget = category.budgets.reduce((sum, budget) => sum + Number(budget.amount), 0);
                const totalSpent = category.budgets.reduce((sum, budget) => sum + Number(budget.spentAmount), 0);
                const remaining = totalBudget - totalSpent;
                return {
                    id: category.id,
                    name: category.name,
                    color: category.color,
                    icon: category.icon,
                    totalBudget,
                    totalSpent,
                    remaining,
                    utilizationPercentage: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
                };
            });
            res.json(summary);
        }
        catch (error) {
            console.error('Error fetching expense summary:', error);
            res.status(500).json({ error: 'Failed to fetch expense summary' });
        }
    });
    // Get expenses
    router.get('/expenses', async (req, res) => {
        const companyId = String(req.query.companyId || '');
        const status = req.query.status;
        const categoryId = req.query.categoryId;
        const accountId = req.query.accountId;
        const paymentMethod = req.query.paymentMethod;
        const isBillable = req.query.isBillable;
        const department = req.query.department;
        const project = req.query.project;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const search = req.query.search;
        try {
            const where = {
                tenantId: req.tenantId,
                companyId: companyId || undefined
            };
            if (status && status !== 'all') {
                where.status = status;
            }
            if (categoryId) {
                where.categoryId = categoryId;
            }
            if (accountId) {
                where.accountId = accountId;
            }
            if (paymentMethod) {
                where.paymentMethod = paymentMethod;
            }
            if (isBillable) {
                where.isBillable = isBillable === 'true';
            }
            if (department) {
                where.department = { contains: department };
            }
            if (project) {
                where.project = { contains: project };
            }
            if (startDate) {
                where.expenseDate = { ...where.expenseDate, gte: new Date(startDate) };
            }
            if (endDate) {
                where.expenseDate = { ...where.expenseDate, lte: new Date(endDate) };
            }
            if (search) {
                where.OR = [
                    { description: { contains: search } },
                    { vendorName: { contains: search } },
                    { referenceNumber: { contains: search } }
                ];
            }
            const [expenses, total] = await Promise.all([
                prisma.expense.findMany({
                    where,
                    include: {
                        category: true,
                        vendor: true,
                        account: true
                    },
                    orderBy: { expenseDate: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit
                }),
                prisma.expense.count({ where })
            ]);
            res.json({
                items: expenses,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        }
        catch (error) {
            console.error('Error fetching expenses:', error);
            res.status(500).json({ error: 'Failed to fetch expenses' });
        }
    });
    // Get single expense
    router.get('/expenses/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const expense = await prisma.expense.findFirst({
                where: {
                    id,
                    tenantId: req.tenantId
                },
                include: {
                    category: true,
                    vendor: true,
                    account: true
                }
            });
            if (!expense) {
                return res.status(404).json({ error: 'Expense not found' });
            }
            res.json(expense);
        }
        catch (error) {
            console.error('Error fetching expense:', error);
            res.status(500).json({ error: 'Failed to fetch expense' });
        }
    });
    // Create expense
    router.post('/expenses', async (req, res) => {
        const data = req.body;
        try {
            console.log('Creating expense with data:', JSON.stringify(data, null, 2));
            // Validate required fields
            if (!data.companyId) {
                return res.status(400).json({ error: 'companyId is required' });
            }
            if (!data.description) {
                return res.status(400).json({ error: 'description is required' });
            }
            if (!data.amount && !data.totalAmount) {
                return res.status(400).json({ error: 'amount is required' });
            }
            if (!data.expenseDate) {
                return res.status(400).json({ error: 'expenseDate is required' });
            }
            if (!data.categoryId) {
                return res.status(400).json({ error: 'categoryId is required' });
            }
            // Always create new expenses as drafts - budget validation happens on approval
            console.log('Creating expense as draft (budget validation will happen on approval)');
            console.log('🔍 Request tenantId:', req.tenantId);
            console.log('🔍 Request companyId:', data.companyId);
            console.log('🔍 Request categoryId:', data.categoryId);
            console.log('🔍 Full request data:', JSON.stringify(data, null, 2));
            // Clean up empty strings for optional foreign key fields
            const cleanedData = {
                ...data,
                // Convert empty strings to undefined for optional foreign key fields
                vendorId: data.vendorId && data.vendorId.trim() !== '' ? data.vendorId : undefined,
                accountId: data.accountId && data.accountId.trim() !== '' ? data.accountId : undefined,
                splitAccountId: data.splitAccountId && data.splitAccountId.trim() !== '' ? data.splitAccountId : undefined
            };
            console.log('🧹 Cleaned data for Prisma:', JSON.stringify(cleanedData, null, 2));
            // Always create expenses as drafts by default
            console.log('Creating expense in database...');
            const expense = await prisma.expense.create({
                data: {
                    tenantId: req.tenantId,
                    companyId: cleanedData.companyId,
                    description: cleanedData.description,
                    amount: cleanedData.amount,
                    totalAmount: cleanedData.totalAmount || cleanedData.amount,
                    expenseDate: new Date(cleanedData.expenseDate),
                    categoryId: cleanedData.categoryId,
                    vendorId: cleanedData.vendorId,
                    vendorName: cleanedData.vendorName,
                    status: 'draft', // Force status to be draft
                    receiptUrl: cleanedData.receiptUrl,
                    notes: cleanedData.notes,
                    // Store selected budget ID in department field for now (temporary solution)
                    department: cleanedData.budgetId && cleanedData.budgetId !== 'auto' ? cleanedData.budgetId : cleanedData.department,
                    project: cleanedData.project,
                    // Enhanced accounting fields
                    accountId: cleanedData.accountId,
                    referenceNumber: cleanedData.referenceNumber,
                    paymentMethod: cleanedData.paymentMethod,
                    currency: cleanedData.currency || 'USD',
                    exchangeRate: cleanedData.exchangeRate || 1.0,
                    taxRate: cleanedData.taxRate,
                    taxAmount: cleanedData.taxAmount,
                    isBillable: cleanedData.isBillable || false,
                    isRecurring: cleanedData.isRecurring || false,
                    recurringPeriod: cleanedData.recurringPeriod,
                    nextRecurringDate: cleanedData.nextRecurringDate ? new Date(cleanedData.nextRecurringDate) : undefined,
                    mileage: cleanedData.mileage,
                    mileageRate: cleanedData.mileageRate,
                    splitAccountId: cleanedData.splitAccountId,
                    attachments: cleanedData.attachments,
                    submittedBy: cleanedData.submittedBy || req.userId
                },
                include: {
                    category: true,
                    vendor: true,
                    account: true
                }
            });
            // Updatebudgets only for non-draft expenses
            if ((expense.status || 'draft') !== 'draft') {
                await adjustBudgetsForExpense({
                    tenantId: expense.tenantId,
                    companyId: expense.companyId,
                    categoryId: expense.categoryId,
                    expenseDate: expense.expenseDate,
                    amount: Number(expense.totalAmount || expense.amount || 0)
                });
            }
            // Create journal entry for non-draft expenses
            try {
                if (expense.status !== 'draft') {
                    await expenseJournalIntegration.integrateExpenseWithJournal({
                        tenantId: expense.tenantId,
                        companyId: expense.companyId,
                        expenseId: expense.id,
                        action: 'create',
                        userId: req.userId
                    });
                }
            }
            catch (journalError) {
                console.error('Error creating journal entry for expense:', journalError);
                // Don't fail the expense creation if journal entry fails
            }
            res.status(201).json(expense);
        }
        catch (error) {
            console.error('Error creating expense:', error);
            console.error('Request data was:', JSON.stringify(data, null, 2));
            // Return more specific error information
            if (error instanceof Error) {
                return res.status(400).json({
                    error: 'Failed to create expense',
                    details: error.message,
                    stack: error.stack
                });
            }
            res.status(500).json({ error: 'Failed to create expense' });
        }
    });
    // Update expense
    router.put('/expenses/:id', async (req, res) => {
        const { id } = req.params;
        const data = req.body;
        try {
            // For non-draft updates, check budget if category or amount is being changed
            if (data.status !== 'draft' && (data.categoryId || data.amount || data.totalAmount)) {
                const existing = await prisma.expense.findFirst({
                    where: { id },
                    select: { categoryId: true, amount: true, totalAmount: true, status: true }
                });
                // Only check budget if:
                // 1. Changing from draft to non-draft status, or
                // 2. Changing category or amount for an already active expense
                const isBecomingActive = existing?.status === 'draft' && data.status !== 'draft';
                const isChangingCategory = data.categoryId && data.categoryId !== existing?.categoryId;
                const isIncreasingAmount = (data.amount && data.amount > (existing?.amount || 0)) ||
                    (data.totalAmount && data.totalAmount > (existing?.totalAmount || 0));
                if (isBecomingActive || isChangingCategory || isIncreasingAmount) {
                    const categoryId = data.categoryId || existing?.categoryId;
                    const expenseDate = data.expenseDate ? new Date(data.expenseDate) : undefined;
                    if (categoryId && expenseDate) {
                        const { available } = await getAvailableBudget({
                            tenantId: req.tenantId,
                            companyId: data.companyId,
                            categoryId,
                            expenseDate
                        });
                        const currentAmount = Number(existing?.totalAmount || existing?.amount || 0);
                        const newAmount = Number(data.totalAmount || data.amount || currentAmount);
                        const amountIncrease = newAmount - currentAmount;
                        if (available < amountIncrease) {
                            return res.status(400).json({
                                error: 'Insufficient budget',
                                details: `Available budget: ${available}, Required increase: ${amountIncrease}`,
                                code: 'BUDGET_EXCEEDED'
                            });
                        }
                    }
                }
            }
            const prev = await prisma.expense.findFirst({ where: { id } });
            const expense = await prisma.expense.update({
                where: { id },
                data: {
                    description: data.description,
                    amount: data.amount,
                    totalAmount: data.totalAmount,
                    expenseDate: data.expenseDate ? new Date(data.expenseDate) : undefined,
                    categoryId: data.categoryId,
                    vendorId: data.vendorId,
                    vendorName: data.vendorName,
                    status: data.status,
                    receiptUrl: data.receiptUrl,
                    notes: data.notes,
                    department: data.department,
                    project: data.project,
                    // Enhanced accounting fields
                    accountId: data.accountId,
                    referenceNumber: data.referenceNumber,
                    paymentMethod: data.paymentMethod,
                    currency: data.currency,
                    exchangeRate: data.exchangeRate,
                    taxRate: data.taxRate,
                    taxAmount: data.taxAmount,
                    isBillable: data.isBillable,
                    isRecurring: data.isRecurring,
                    recurringPeriod: data.recurringPeriod,
                    nextRecurringDate: data.nextRecurringDate ? new Date(data.nextRecurringDate) : undefined,
                    mileage: data.mileage,
                    mileageRate: data.mileageRate,
                    splitAccountId: data.splitAccountId,
                    attachments: data.attachments
                },
                include: {
                    category: true,
                    vendor: true,
                    account: true
                }
            });
            // Adjust budgets based on changes crossing draft/non-draft boundary or category/date/amount changes
            if (prev) {
                const prevActive = (prev.status || 'draft') !== 'draft';
                const newActive = (expense.status || 'draft') !== 'draft';
                const prevAmt = Number(prev.totalAmount || prev.amount || 0);
                const newAmt = Number(expense.totalAmount || expense.amount || 0);
                const prevDate = prev.expenseDate ? new Date(prev.expenseDate) : undefined;
                const newDate = expense.expenseDate ? new Date(expense.expenseDate) : undefined;
                // If previously counted, remove from previous budgets
                if (prevActive && prev.categoryId && prevDate) {
                    await adjustBudgetsForExpense({
                        tenantId: expense.tenantId,
                        companyId: expense.companyId,
                        categoryId: prev.categoryId,
                        expenseDate: prevDate,
                        amount: -prevAmt
                    });
                }
                // If now should be counted, add to new budgets
                if (newActive && expense.categoryId && newDate) {
                    await adjustBudgetsForExpense({
                        tenantId: expense.tenantId,
                        companyId: expense.companyId,
                        categoryId: expense.categoryId,
                        expenseDate: newDate,
                        amount: newAmt
                    });
                }
            }
            // Update journal entry for expense changes
            try {
                await expenseJournalIntegration.integrateExpenseWithJournal({
                    tenantId: expense.tenantId,
                    companyId: expense.companyId,
                    expenseId: expense.id,
                    action: 'update',
                    userId: req.userId
                });
            }
            catch (journalError) {
                console.error('Error updating journal entry for expense:', journalError);
                // Don't fail the expense update if journal entry fails
            }
            res.json(expense);
        }
        catch (error) {
            console.error('Error updating expense:', error);
            res.status(500).json({ error: 'Failed to update expense' });
        }
    });
    // Delete expense
    router.delete('/expenses/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const expense = await prisma.expense.findFirst({
                where: { id, tenantId: req.tenantId }
            });
            if (!expense) {
                return res.status(404).json({ error: 'Expense not found' });
            }
            // Delete journal entry before deleting expense
            try {
                await expenseJournalIntegration.integrateExpenseWithJournal({
                    tenantId: expense.tenantId,
                    companyId: expense.companyId,
                    expenseId: expense.id,
                    action: 'delete',
                    userId: req.userId
                });
            }
            catch (journalError) {
                console.error('Error deleting journal entry for expense:', journalError);
                // Continue with expense deletion even if journal entry fails
            }
            await prisma.expense.delete({
                where: { id }
            });
            if ((expense.status || 'draft') !== 'draft') {
                await adjustBudgetsForExpense({
                    tenantId: expense.tenantId,
                    companyId: expense.companyId,
                    categoryId: expense.categoryId,
                    expenseDate: expense.expenseDate,
                    amount: -Number(expense.totalAmount || expense.amount || 0)
                });
            }
            res.json({ message: 'Expense deleted successfully' });
        }
        catch (error) {
            console.error('Error deleting expense:', error);
            res.status(500).json({ error: 'Failed to delete expense' });
        }
    });
    // Submit expense for approval
    router.post('/expenses/:id/submit', async (req, res) => {
        const { id } = req.params;
        try {
            const before = await prisma.expense.findFirst({ where: { id } });
            const expense = await prisma.expense.update({
                where: { id },
                data: { status: 'submitted' },
                include: {
                    category: true,
                    vendor: true
                }
            });
            // If transitioned from draft to submitted, add to budgets
            if (before && (before.status || 'draft') === 'draft') {
                await adjustBudgetsForExpense({
                    tenantId: expense.tenantId,
                    companyId: expense.companyId,
                    categoryId: expense.categoryId,
                    expenseDate: expense.expenseDate,
                    amount: Number(expense.totalAmount || expense.amount || 0)
                });
            }
            // Create journal entry for submitted expense
            try {
                await expenseJournalIntegration.integrateExpenseWithJournal({
                    tenantId: expense.tenantId,
                    companyId: expense.companyId,
                    expenseId: expense.id,
                    action: 'create',
                    userId: req.userId
                });
            }
            catch (journalError) {
                console.error('Error creating journal entry for submitted expense:', journalError);
                // Don't fail the submission if journal entry fails
            }
            res.json(expense);
        }
        catch (error) {
            console.error('Error submitting expense:', error);
            res.status(500).json({ error: 'Failed to submit expense' });
        }
    });
    router.post('/expenses/:id/approve', async (req, res) => {
        const { id } = req.params;
        try {
            // Get expense with selected budget info (SENIOR SOLUTION)
            const existingExpense = await prisma.expense.findUnique({
                where: { id },
                select: {
                    status: true,
                    categoryId: true,
                    companyId: true,
                    expenseDate: true,
                    totalAmount: true,
                    amount: true,
                    department: true // Contains selected budgetId
                }
            });
            if (!existingExpense) {
                return res.status(404).json({ error: 'Expense not found' });
            }
            // Only process if expense wasn't already approved
            if (existingExpense.status !== 'approved') {
                const expenseAmount = Number(existingExpense.totalAmount || existingExpense.amount || 0);
                const selectedBudgetId = existingExpense.department; // budgetId stored in department field
                console.log('Approving expense:', { expenseAmount, selectedBudgetId });
                // SENIOR SOLUTION: Validate and reduce ONLY the selected budget
                if (selectedBudgetId && selectedBudgetId !== 'auto') {
                    try {
                        const budgetValidation = await validateSpecificBudget({
                            budgetId: selectedBudgetId,
                            expenseAmount,
                            expenseDate: existingExpense.expenseDate
                        });
                        console.log('Budget validation:', budgetValidation);
                        // Only validate funds if budget was found
                        if (budgetValidation.budgetName !== 'Budget not found - skipping validation') {
                            if (budgetValidation.available < expenseAmount) {
                                console.log('Sending insufficient funds error to frontend');
                                return res.status(400).json({
                                    error: 'Insufficient budget funds',
                                    details: `Budget "${budgetValidation.budgetName}" has only $${budgetValidation.available} available, but expense requires $${expenseAmount}`,
                                    code: 'BUDGET_EXCEEDED'
                                });
                            }
                            // Reduce ONLY the selected budget (prevents double-counting)
                            await adjustSpecificBudget({
                                budgetId: selectedBudgetId,
                                amount: expenseAmount
                            });
                            console.log(`Reduced budget ${budgetValidation.budgetName} by $${expenseAmount}`);
                        }
                        else {
                            console.log('Skipping budget reduction due to invalid budget ID');
                        }
                    }
                    catch (validationError) {
                        console.log('Sending validation error to frontend:', validationError.message);
                        console.log('Response headers sent?', res.headersSent);
                        // Make sure we haven't already sent a response
                        if (!res.headersSent) {
                            return res.status(400).json({
                                error: 'Budget validation failed',
                                details: validationError.message || 'Unknown validation error',
                                code: 'BUDGET_VALIDATION_ERROR'
                            });
                        }
                    }
                }
            }
            // SENIOR ACCOUNTING SOLUTION: Ensure GL account is assigned before approval
            let expenseToApprove = existingExpense;
            if (!existingExpense.accountId) {
                console.log(`🔧 Senior Accounting: Expense ${id} missing GL account, auto-assigning...`);
                // Automatically assign the most appropriate GL account
                const assignedAccountId = await smartGLAccountAssignment.assignOptimalGLAccount({
                    tenantId: req.tenantId,
                    companyId: existingExpense.companyId,
                    expenseId: id,
                    expenseCategoryId: existingExpense.categoryId,
                    expenseDescription: existingExpense.description,
                    expenseAmount: Number(existingExpense.totalAmount || existingExpense.amount || 0)
                });
                if (assignedAccountId) {
                    // Update the expense with the assigned GL account
                    await prisma.expense.update({
                        where: { id },
                        data: { accountId: assignedAccountId }
                    });
                    console.log(`✅ Senior Accounting: Auto-assigned GL account ${assignedAccountId} to expense ${id}`);
                }
                else {
                    console.warn(`⚠️ Senior Accounting: Could not auto-assign GL account for expense ${id}`);
                }
            }
            // Now update the expense status
            const expense = await prisma.expense.update({
                where: { id },
                data: { status: 'approved' },
                include: {
                    category: true,
                    vendor: true,
                    account: true
                }
            });
            // Create or update journal entry for approved expense
            try {
                await expenseJournalIntegration.integrateExpenseWithJournal({
                    tenantId: expense.tenantId,
                    companyId: expense.companyId,
                    expenseId: expense.id,
                    action: 'approve',
                    userId: req.userId
                });
                console.log(`✅ Senior Accounting: Journal entry created for expense ${expense.id}`);
            }
            catch (journalError) {
                console.error('❌ Senior Accounting: Error creating journal entry for approved expense:', journalError);
                // Don't fail the approval if journal entry fails
            }
            res.json(expense);
        }
        catch (error) {
            console.error('Error approving expense:', error);
            // Don't override our specific validation errors that already sent responses
            if (res.headersSent) {
                return; // Response already sent by validation error handler
            }
            // Handle other unexpected errors
            res.status(500).json({
                error: 'Failed to approve expense',
                details: error.message || 'Unknown error occurred'
            });
        }
    });
    // SENIOR ACCOUNTING: Bulk fix for expenses without GL accounts
    router.post('/expenses/bulk-assign-gl-accounts', async (req, res) => {
        try {
            console.log('🔧 Senior Accounting: Starting bulk GL account assignment...');
            // Find all approved expenses without GL accounts
            const expensesWithoutAccounts = await prisma.expense.findMany({
                where: {
                    tenantId: req.tenantId,
                    companyId: req.header('x-company-id') || String(req.query.companyId || ''),
                    status: 'approved',
                    accountId: null
                },
                include: {
                    category: true
                }
            });
            console.log(`Found ${expensesWithoutAccounts.length} expenses without GL accounts`);
            const results = {
                total: expensesWithoutAccounts.length,
                assigned: 0,
                failed: 0,
                details: []
            };
            for (const expense of expensesWithoutAccounts) {
                try {
                    const assignedAccountId = await smartGLAccountAssignment.assignOptimalGLAccount({
                        tenantId: req.tenantId,
                        companyId: expense.companyId,
                        expenseId: expense.id,
                        expenseCategoryId: expense.categoryId,
                        expenseDescription: expense.description,
                        expenseAmount: Number(expense.totalAmount || expense.amount || 0)
                    });
                    if (assignedAccountId) {
                        await prisma.expense.update({
                            where: { id: expense.id },
                            data: { accountId: assignedAccountId }
                        });
                        results.assigned++;
                        results.details.push({
                            expenseId: expense.id,
                            description: expense.description,
                            amount: expense.amount,
                            status: 'assigned',
                            accountId: assignedAccountId
                        });
                        console.log(`✅ Assigned GL account to expense: ${expense.description}`);
                    }
                    else {
                        results.failed++;
                        results.details.push({
                            expenseId: expense.id,
                            description: expense.description,
                            amount: expense.amount,
                            status: 'failed',
                            reason: 'No suitable GL account found'
                        });
                    }
                }
                catch (error) {
                    results.failed++;
                    results.details.push({
                        expenseId: expense.id,
                        description: expense.description,
                        amount: expense.amount,
                        status: 'error',
                        reason: error.message
                    });
                }
            }
            console.log(`🎉 Senior Accounting: Bulk assignment complete - ${results.assigned} assigned, ${results.failed} failed`);
            res.json(results);
        }
        catch (error) {
            console.error('Error in bulk GL account assignment:', error);
            res.status(500).json({ error: 'Failed to assign GL accounts', details: error.message });
        }
    });
    // SENIOR ACCOUNTING: Account Code Management Endpoints
    router.get('/account-codes/audit', async (req, res) => {
        try {
            console.log('🔍 Senior Accounting: Starting account code audit...');
            const companyId = req.header('x-company-id') || String(req.query.companyId || '');
            const auditResults = await seniorAccountCodeManager.auditAccountCodes(req.tenantId, companyId);
            const summary = {
                totalAccounts: auditResults.length,
                accountsWithIssues: auditResults.filter(r => r.issues.length > 0).length,
                accountsWithRecommendations: auditResults.filter(r => r.recommendations.length > 0).length,
                criticalIssues: auditResults.filter(r => r.issues.some(i => i.includes('Type mismatch'))).length
            };
            console.log(`✅ Account audit complete: ${summary.totalAccounts} accounts, ${summary.accountsWithIssues} with issues`);
            res.json({ summary, details: auditResults });
        }
        catch (error) {
            console.error('Error in account code audit:', error);
            res.status(500).json({ error: 'Failed to audit account codes', details: error.message });
        }
    });
    router.post('/account-codes/create-standard', async (req, res) => {
        try {
            console.log('🔧 Senior Accounting: Creating missing standard accounts...');
            const companyId = req.header('x-company-id') || String(req.query.companyId || '');
            const result = await seniorAccountCodeManager.createMissingStandardAccounts(req.tenantId, companyId);
            console.log(`✅ Created ${result.created} standard accounts, ${result.errors.length} errors`);
            res.json(result);
        }
        catch (error) {
            console.error('Error creating standard accounts:', error);
            res.status(500).json({ error: 'Failed to create standard accounts', details: error.message });
        }
    });
    router.post('/account-codes/validate', async (req, res) => {
        try {
            const { accountCode, usageContext } = req.body;
            const companyId = req.header('x-company-id') || String(req.query.companyId || '');
            if (!accountCode || !usageContext) {
                return res.status(400).json({ error: 'accountCode and usageContext are required' });
            }
            const validation = await seniorAccountCodeManager.validateAccountUsage(accountCode, usageContext, req.tenantId, companyId);
            res.json(validation);
        }
        catch (error) {
            console.error('Error validating account usage:', error);
            res.status(500).json({ error: 'Failed to validate account usage', details: error.message });
        }
    });
    router.get('/account-codes/recommend', async (req, res) => {
        try {
            const { usageContext } = req.query;
            const companyId = req.header('x-company-id') || String(req.query.companyId || '');
            if (!usageContext) {
                return res.status(400).json({ error: 'usageContext is required' });
            }
            const recommendedAccount = await seniorAccountCodeManager.getRecommendedAccount(String(usageContext), req.tenantId, companyId);
            res.json({ recommendedAccount });
        }
        catch (error) {
            console.error('Error getting recommended account:', error);
            res.status(500).json({ error: 'Failed to get recommended account', details: error.message });
        }
    });
    // Get journal entries for an expense
    router.get('/expenses/:id/journal-entries', async (req, res) => {
        const { id } = req.params;
        try {
            const journalEntries = await prisma.journalEntry.findMany({
                where: {
                    tenantId: req.tenantId,
                    reference: {
                        contains: `-${id.substring(0, 8).toUpperCase()}`
                    }
                },
                include: {
                    lines: {
                        include: {
                            account: true
                        }
                    },
                    entryType: true,
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            res.json(journalEntries);
        }
        catch (error) {
            console.error('Error fetching journal entries for expense:', error);
            res.status(500).json({ error: 'Failed to fetch journal entries' });
        }
    });
    // Reject expense
    router.post('/expenses/:id/reject', async (req, res) => {
        const { id } = req.params;
        const { reason } = req.body;
        try {
            const expense = await prisma.expense.update({
                where: { id },
                data: {
                    status: 'rejected',
                    notes: reason ? `Rejected: ${reason}` : 'Rejected'
                },
                include: {
                    category: true,
                    vendor: true,
                    account: true
                }
            });
            // Handle journal entry for rejected expense
            try {
                await expenseJournalIntegration.integrateExpenseWithJournal({
                    tenantId: expense.tenantId,
                    companyId: expense.companyId,
                    expenseId: expense.id,
                    action: 'reject',
                    userId: req.userId
                });
            }
            catch (journalError) {
                console.error('Error handling journal entry for rejected expense:', journalError);
                // Don't fail the rejection if journal entry fails
            }
            // Remove from budgets if it was previously counted
            if (expense.status !== 'draft') {
                await adjustBudgetsForExpense({
                    tenantId: expense.tenantId,
                    companyId: expense.companyId,
                    categoryId: expense.categoryId,
                    expenseDate: expense.expenseDate,
                    amount: -Number(expense.totalAmount || expense.amount || 0)
                });
            }
            res.json(expense);
        }
        catch (error) {
            console.error('Error rejecting expense:', error);
            res.status(500).json({ error: 'Failed to reject expense' });
        }
    });
}
