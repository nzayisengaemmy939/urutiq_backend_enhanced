import { prisma } from './prisma';
export function mountWorkflowRoutes(router) {
    // Create workflow
    router.post('/workflows', async (req, res) => {
        try {
            const { name, description, category, templateId, steps } = req.body;
            // Get a valid document ID for draft workflows
            const firstDocument = await prisma.fileAsset.findFirst({
                where: {
                    tenantId: req.tenantId,
                    companyId: req.query.companyId || 'seed-company-1'
                }
            });
            if (!firstDocument) {
                return res.status(400).json({ error: 'No documents found to create workflow' });
            }
            // Get a valid user ID
            const firstUser = await prisma.appUser.findFirst({
                where: { tenantId: req.tenantId }
            });
            if (!firstUser) {
                return res.status(400).json({ error: 'No users found to assign workflow' });
            }
            // Create a new workflow in the database
            const workflow = await prisma.documentWorkflow.create({
                data: {
                    id: `workflow-${Date.now()}`,
                    tenantId: req.tenantId,
                    companyId: req.query.companyId || 'seed-company-1',
                    documentId: firstDocument.id,
                    workflowType: name,
                    status: 'draft',
                    assignedTo: firstUser.id,
                    assignedAt: new Date(),
                    comments: description,
                    // Store additional workflow data in metadata
                    metadata: JSON.stringify({
                        category,
                        templateId,
                        steps,
                        createdAt: new Date().toISOString()
                    })
                }
            });
            res.json({
                workflow: {
                    id: workflow.id,
                    name: workflow.workflowType,
                    description: workflow.comments,
                    status: 'draft',
                    category,
                    steps,
                    createdAt: workflow.assignedAt.toISOString(),
                    updatedAt: workflow.updatedAt?.toISOString() || workflow.assignedAt.toISOString()
                }
            });
        }
        catch (error) {
            console.error('Error creating workflow:', error);
            res.status(500).json({ error: 'Failed to create workflow' });
        }
    });
    // List workflows
    router.get('/workflows', async (req, res) => {
        console.log('🔥 WORKFLOWS ROUTE HIT - This should appear in logs!');
        const companyId = String(req.query.companyId || '');
        const status = String(req.query.status || '');
        const assignedTo = String(req.query.assignedTo || '');
        const page = parseInt(String(req.query.page || '1'));
        const limit = parseInt(String(req.query.limit || '20'));
        const offset = (page - 1) * limit;
        const where = { tenantId: req.tenantId };
        if (companyId)
            where.companyId = companyId;
        if (status)
            where.status = status;
        if (assignedTo)
            where.assignedTo = assignedTo;
        const [workflows, total] = await Promise.all([
            prisma.documentWorkflow.findMany({
                where,
                include: {
                    assignedUser: {
                        select: { id: true, name: true, email: true }
                    },
                    document: {
                        select: { id: true, name: true, displayName: true }
                    }
                },
                orderBy: { assignedAt: 'desc' },
                skip: offset,
                take: limit
            }),
            prisma.documentWorkflow.count({ where })
        ]);
        // Transform workflows to match frontend expectations
        const transformedWorkflows = workflows.map(workflow => {
            const metadata = workflow.metadata ? JSON.parse(workflow.metadata) : {};
            return {
                id: workflow.id,
                name: workflow.workflowType || 'Document Workflow',
                description: workflow.comments || 'Document processing workflow',
                status: workflow.status === 'assigned' ? 'active' :
                    workflow.status === 'completed' ? 'completed' :
                        workflow.status === 'draft' ? 'draft' : 'paused',
                category: metadata.category || 'General',
                steps: metadata.steps || [],
                createdAt: workflow.assignedAt.toISOString(),
                updatedAt: workflow.updatedAt?.toISOString() || workflow.assignedAt.toISOString(),
                documentCount: workflow.documentId ? 1 : 0, // Only count if assigned to a document
                completedToday: workflow.status === 'completed' &&
                    workflow.completedAt &&
                    workflow.completedAt.toDateString() === new Date().toDateString() ? 1 : 0,
                averageProcessingTime: workflow.completedAt && workflow.assignedAt ?
                    (workflow.completedAt.getTime() - workflow.assignedAt.getTime()) / (1000 * 60 * 60) : 0
            };
        });
        res.json({
            workflows: transformedWorkflows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    });
    // Workflow Statistics
    router.get('/workflows/stats', async (req, res) => {
        try {
            const companyId = String(req.query.companyId || '');
            const where = { tenantId: req.tenantId };
            if (companyId)
                where.companyId = companyId;
            // Get active workflows count (pending status)
            const activeWorkflows = await prisma.documentWorkflow.count({
                where: { ...where, status: 'pending' }
            });
            // Get pending approvals count (same as active for now)
            const pendingApprovals = await prisma.documentWorkflow.count({
                where: { ...where, status: 'pending' }
            });
            // Get completed today count
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const completedToday = await prisma.documentWorkflow.count({
                where: {
                    ...where,
                    status: 'completed',
                    completedAt: { gte: today }
                }
            });
            // Calculate average processing time
            const completedWorkflows = await prisma.documentWorkflow.findMany({
                where: {
                    ...where,
                    status: 'completed',
                    completedAt: { not: null }
                },
                select: {
                    assignedAt: true,
                    completedAt: true
                }
            });
            let averageProcessingTime = 0;
            if (completedWorkflows.length > 0) {
                const validWorkflows = completedWorkflows.filter(workflow => workflow.completedAt && workflow.assignedAt);
                if (validWorkflows.length > 0) {
                    const totalTime = validWorkflows.reduce((sum, workflow) => {
                        const processingTime = workflow.completedAt.getTime() - workflow.assignedAt.getTime();
                        return sum + processingTime;
                    }, 0);
                    averageProcessingTime = totalTime / validWorkflows.length / (1000 * 60 * 60); // Convert to hours
                }
            }
            res.json({
                activeWorkflows,
                pendingApprovals,
                completedToday,
                averageProcessingTime: Math.round(averageProcessingTime * 10) / 10 // Round to 1 decimal
            });
        }
        catch (error) {
            console.error('Error fetching workflow stats:', error);
            // Return default values instead of error
            res.json({
                activeWorkflows: 0,
                pendingApprovals: 0,
                completedToday: 0,
                averageProcessingTime: 0
            });
        }
    });
    // Workflow Templates
    router.get('/workflows/templates', async (req, res) => {
        try {
            // Return predefined workflow templates
            const templates = [
                {
                    id: 'invoice-processing',
                    name: 'Invoice Processing',
                    description: 'Automated invoice validation, approval routing, and payment processing',
                    category: 'Finance',
                    steps: [
                        { id: '1', name: 'Validate Invoice', type: 'validation', order: 1 },
                        { id: '2', name: 'Route for Approval', type: 'approval', order: 2 },
                        { id: '3', name: 'Process Payment', type: 'action', order: 3 }
                    ]
                },
                {
                    id: 'contract-review',
                    name: 'Contract Review',
                    description: 'Legal review workflow with multiple approval stages',
                    category: 'Legal',
                    steps: [
                        { id: '1', name: 'Initial Review', type: 'review', order: 1 },
                        { id: '2', name: 'Legal Approval', type: 'approval', order: 2 },
                        { id: '3', name: 'Final Sign-off', type: 'approval', order: 3 }
                    ]
                },
                {
                    id: 'document-classification',
                    name: 'Document Classification',
                    description: 'AI-powered document categorization and metadata extraction',
                    category: 'AI',
                    steps: [
                        { id: '1', name: 'AI Analysis', type: 'ai_processing', order: 1 },
                        { id: '2', name: 'Category Assignment', type: 'classification', order: 2 },
                        { id: '3', name: 'Metadata Extraction', type: 'extraction', order: 3 }
                    ]
                }
            ];
            res.json({ templates });
        }
        catch (error) {
            console.error('Error fetching workflow templates:', error);
            res.status(500).json({ error: 'Failed to fetch workflow templates' });
        }
    });
}
