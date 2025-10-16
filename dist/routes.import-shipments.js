import { prisma } from './prisma';
import { validateBody } from './validate';
import { z } from 'zod';
// Validation schemas
const importShipmentSchemas = {
    create: z.object({
        companyId: z.string(),
        purchaseOrderId: z.string(),
        shipmentNumber: z.string().min(1),
        shipmentDate: z.string().datetime(),
        expectedArrival: z.string().datetime().optional(),
        carrier: z.string().optional(),
        trackingNumber: z.string().optional(),
        containerNumber: z.string().optional(),
        vesselFlight: z.string().optional(),
        customsBroker: z.string().optional(),
        billOfLading: z.string().optional(),
        commercialInvoice: z.string().optional(),
        packingList: z.string().optional(),
        certificateOfOrigin: z.string().optional(),
        insuranceCertificate: z.string().optional(),
        freightCost: z.number().nonnegative().default(0),
        insuranceCost: z.number().nonnegative().default(0),
        customsFees: z.number().nonnegative().default(0),
        storageCost: z.number().nonnegative().default(0),
        otherCosts: z.number().nonnegative().default(0),
        notes: z.string().optional()
    }),
    update: z.object({
        expectedArrival: z.string().datetime().optional(),
        actualArrival: z.string().datetime().optional(),
        status: z.enum(['pending', 'in_transit', 'arrived', 'cleared', 'delivered']).optional(),
        carrier: z.string().optional(),
        trackingNumber: z.string().optional(),
        containerNumber: z.string().optional(),
        vesselFlight: z.string().optional(),
        customsBroker: z.string().optional(),
        customsEntryDate: z.string().datetime().optional(),
        customsReleaseDate: z.string().datetime().optional(),
        dutiesPaid: z.number().nonnegative().optional(),
        taxesPaid: z.number().nonnegative().optional(),
        billOfLading: z.string().optional(),
        commercialInvoice: z.string().optional(),
        packingList: z.string().optional(),
        certificateOfOrigin: z.string().optional(),
        insuranceCertificate: z.string().optional(),
        freightCost: z.number().nonnegative().optional(),
        insuranceCost: z.number().nonnegative().optional(),
        customsFees: z.number().nonnegative().optional(),
        storageCost: z.number().nonnegative().optional(),
        otherCosts: z.number().nonnegative().optional(),
        notes: z.string().optional(),
        issues: z.string().optional() // JSON string
    }),
    customsEvent: z.object({
        eventType: z.enum(['shipment_created', 'customs_entry', 'customs_hold', 'customs_release', 'delivery']),
        eventDate: z.string().datetime(),
        description: z.string().min(1),
        location: z.string().optional(),
        documents: z.string().optional(), // JSON string
        status: z.enum(['pending', 'completed', 'failed']).default('completed'),
        notes: z.string().optional()
    })
};
export function mountImportShipmentRoutes(router) {
    // Get all import shipments
    router.get('/import-shipments', async (req, res) => {
        const companyId = String(req.query.companyId || '');
        const purchaseOrderId = req.query.purchaseOrderId || undefined;
        const status = req.query.status || undefined;
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10)));
        const skip = (page - 1) * pageSize;
        try {
            const where = {
                tenantId: req.tenantId,
                companyId,
                purchaseOrderId: purchaseOrderId || undefined,
                status: status || undefined
            };
            Object.keys(where).forEach((k) => where[k] === undefined && delete where[k]);
            const [total, items] = await Promise.all([
                prisma.importShipment.count({ where }),
                prisma.importShipment.findMany({
                    where,
                    include: {
                        purchaseOrder: { include: { vendor: true } },
                        customsEvents: { orderBy: { eventDate: 'desc' } }
                    },
                    orderBy: { shipmentDate: 'desc' },
                    skip,
                    take: pageSize
                })
            ]);
            const totalPages = Math.max(1, Math.ceil(total / pageSize));
            res.json({
                items,
                page,
                pageSize,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            });
        }
        catch (error) {
            console.error('Error fetching import shipments:', error);
            res.status(500).json({ error: 'Failed to fetch import shipments' });
        }
    });
    // Get single import shipment
    router.get('/import-shipments/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const shipment = await prisma.importShipment.findFirst({
                where: {
                    id,
                    tenantId: req.tenantId
                },
                include: {
                    purchaseOrder: {
                        include: {
                            vendor: true,
                            lines: { include: { product: true } }
                        }
                    },
                    customsEvents: { orderBy: { eventDate: 'desc' } }
                }
            });
            if (!shipment) {
                return res.status(404).json({ error: 'Import shipment not found' });
            }
            // Calculate total landed cost
            const totalLandedCost = Number(shipment.freightCost) +
                Number(shipment.insuranceCost) +
                Number(shipment.customsFees) +
                Number(shipment.storageCost) +
                Number(shipment.otherCosts) +
                Number(shipment.dutiesPaid) +
                Number(shipment.taxesPaid);
            res.json({ ...shipment, totalLandedCost });
        }
        catch (error) {
            console.error('Error fetching import shipment:', error);
            res.status(500).json({ error: 'Failed to fetch import shipment' });
        }
    });
    // Create import shipment
    router.post('/import-shipments', validateBody(importShipmentSchemas.create), async (req, res) => {
        const data = req.body;
        try {
            const result = await prisma.$transaction(async (tx) => {
                // Verify purchase order exists and is an import order
                const purchaseOrder = await tx.purchaseOrder.findFirst({
                    where: {
                        id: data.purchaseOrderId,
                        tenantId: req.tenantId,
                        purchaseType: 'import'
                    }
                });
                if (!purchaseOrder) {
                    throw new Error('Purchase order not found or not an import order');
                }
                // Calculate total landed cost
                const totalLandedCost = (data.freightCost || 0) +
                    (data.insuranceCost || 0) +
                    (data.customsFees || 0) +
                    (data.storageCost || 0) +
                    (data.otherCosts || 0);
                // Create import shipment
                const shipment = await tx.importShipment.create({
                    data: {
                        tenantId: req.tenantId,
                        companyId: data.companyId,
                        purchaseOrderId: data.purchaseOrderId,
                        shipmentNumber: data.shipmentNumber,
                        shipmentDate: new Date(data.shipmentDate),
                        expectedArrival: data.expectedArrival ? new Date(data.expectedArrival) : null,
                        carrier: data.carrier,
                        trackingNumber: data.trackingNumber,
                        containerNumber: data.containerNumber,
                        vesselFlight: data.vesselFlight,
                        customsBroker: data.customsBroker,
                        billOfLading: data.billOfLading,
                        commercialInvoice: data.commercialInvoice,
                        packingList: data.packingList,
                        certificateOfOrigin: data.certificateOfOrigin,
                        insuranceCertificate: data.insuranceCertificate,
                        freightCost: data.freightCost,
                        insuranceCost: data.insuranceCost,
                        customsFees: data.customsFees,
                        storageCost: data.storageCost,
                        otherCosts: data.otherCosts,
                        totalLandedCost,
                        notes: data.notes
                    }
                });
                // Create initial customs event
                await tx.customsEvent.create({
                    data: {
                        tenantId: req.tenantId,
                        importShipmentId: shipment.id,
                        eventType: 'shipment_created',
                        eventDate: new Date(data.shipmentDate),
                        description: 'Shipment created and documentation prepared',
                        status: 'completed'
                    }
                });
                return shipment;
            });
            res.status(201).json(result);
        }
        catch (error) {
            console.error('Error creating import shipment:', error);
            res.status(500).json({ error: 'Failed to create import shipment' });
        }
    });
    // Update import shipment
    router.put('/import-shipments/:id', validateBody(importShipmentSchemas.update), async (req, res) => {
        const { id } = req.params;
        const data = req.body;
        try {
            const shipment = await prisma.importShipment.findFirst({
                where: { id, tenantId: req.tenantId }
            });
            if (!shipment) {
                return res.status(404).json({ error: 'Import shipment not found' });
            }
            // Calculate new total landed cost
            const totalLandedCost = (data.freightCost ?? Number(shipment.freightCost)) +
                (data.insuranceCost ?? Number(shipment.insuranceCost)) +
                (data.customsFees ?? Number(shipment.customsFees)) +
                (data.storageCost ?? Number(shipment.storageCost)) +
                (data.otherCosts ?? Number(shipment.otherCosts)) +
                (data.dutiesPaid ?? Number(shipment.dutiesPaid)) +
                (data.taxesPaid ?? Number(shipment.taxesPaid));
            const updatedShipment = await prisma.importShipment.update({
                where: { id },
                data: {
                    expectedArrival: data.expectedArrival ? new Date(data.expectedArrival) : undefined,
                    actualArrival: data.actualArrival ? new Date(data.actualArrival) : undefined,
                    status: data.status,
                    carrier: data.carrier,
                    trackingNumber: data.trackingNumber,
                    containerNumber: data.containerNumber,
                    vesselFlight: data.vesselFlight,
                    customsBroker: data.customsBroker,
                    customsEntryDate: data.customsEntryDate ? new Date(data.customsEntryDate) : undefined,
                    customsReleaseDate: data.customsReleaseDate ? new Date(data.customsReleaseDate) : undefined,
                    dutiesPaid: data.dutiesPaid,
                    taxesPaid: data.taxesPaid,
                    billOfLading: data.billOfLading,
                    commercialInvoice: data.commercialInvoice,
                    packingList: data.packingList,
                    certificateOfOrigin: data.certificateOfOrigin,
                    insuranceCertificate: data.insuranceCertificate,
                    freightCost: data.freightCost,
                    insuranceCost: data.insuranceCost,
                    customsFees: data.customsFees,
                    storageCost: data.storageCost,
                    otherCosts: data.otherCosts,
                    totalLandedCost,
                    notes: data.notes,
                    issues: data.issues
                }
            });
            res.json(updatedShipment);
        }
        catch (error) {
            console.error('Error updating import shipment:', error);
            res.status(500).json({ error: 'Failed to update import shipment' });
        }
    });
    // Add customs event
    router.post('/import-shipments/:id/customs-events', validateBody(importShipmentSchemas.customsEvent), async (req, res) => {
        const { id } = req.params;
        const data = req.body;
        try {
            const shipment = await prisma.importShipment.findFirst({
                where: { id, tenantId: req.tenantId }
            });
            if (!shipment) {
                return res.status(404).json({ error: 'Import shipment not found' });
            }
            const customsEvent = await prisma.customsEvent.create({
                data: {
                    tenantId: req.tenantId,
                    importShipmentId: id,
                    eventType: data.eventType,
                    eventDate: new Date(data.eventDate),
                    description: data.description,
                    location: data.location,
                    documents: data.documents,
                    status: data.status,
                    notes: data.notes
                }
            });
            // Update shipment status based on event type
            let newStatus = shipment.status;
            if (data.eventType === 'customs_entry' && data.status === 'completed') {
                newStatus = 'arrived';
            }
            else if (data.eventType === 'customs_release' && data.status === 'completed') {
                newStatus = 'cleared';
            }
            else if (data.eventType === 'delivery' && data.status === 'completed') {
                newStatus = 'delivered';
            }
            if (newStatus !== shipment.status) {
                await prisma.importShipment.update({
                    where: { id },
                    data: { status: newStatus }
                });
            }
            res.status(201).json(customsEvent);
        }
        catch (error) {
            console.error('Error creating customs event:', error);
            res.status(500).json({ error: 'Failed to create customs event' });
        }
    });
    // Get customs events for shipment
    router.get('/import-shipments/:id/customs-events', async (req, res) => {
        const { id } = req.params;
        try {
            const events = await prisma.customsEvent.findMany({
                where: {
                    importShipmentId: id,
                    tenantId: req.tenantId
                },
                orderBy: { eventDate: 'desc' }
            });
            res.json(events);
        }
        catch (error) {
            console.error('Error fetching customs events:', error);
            res.status(500).json({ error: 'Failed to fetch customs events' });
        }
    });
    // Calculate landed cost allocation
    router.post('/import-shipments/:id/allocate-costs', async (req, res) => {
        const { id } = req.params;
        const { allocationMethod = 'value', customAllocations } = req.body; // value, quantity, custom
        try {
            const shipment = await prisma.importShipment.findFirst({
                where: { id, tenantId: req.tenantId },
                include: {
                    purchaseOrder: {
                        include: {
                            lines: true
                        }
                    }
                }
            });
            if (!shipment) {
                return res.status(404).json({ error: 'Import shipment not found' });
            }
            const totalLandedCost = Number(shipment.totalLandedCost);
            const lines = shipment.purchaseOrder.lines;
            // Calculate allocation based on method
            let allocations = [];
            if (allocationMethod === 'value') {
                const totalValue = lines.reduce((sum, line) => sum + Number(line.lineTotal), 0) || 1;
                allocations = lines.map(line => ({
                    lineId: line.id,
                    allocatedCost: (Number(line.lineTotal) / totalValue) * totalLandedCost
                }));
            }
            else if (allocationMethod === 'quantity') {
                const totalQty = lines.reduce((sum, line) => sum + Number(line.quantity), 0) || 1;
                allocations = lines.map(line => ({
                    lineId: line.id,
                    allocatedCost: (Number(line.quantity) / totalQty) * totalLandedCost
                }));
            }
            else if (allocationMethod === 'custom' && Array.isArray(customAllocations)) {
                const totalShare = customAllocations.reduce((s, a) => s + Number(a.share || 0), 0) || 1;
                allocations = lines.map(line => {
                    const custom = customAllocations.find((a) => a.lineId === line.id);
                    const share = custom ? Number(custom.share || 0) : 0;
                    return { lineId: line.id, allocatedCost: (share / totalShare) * totalLandedCost };
                });
            }
            else {
                // default to value-based
                const totalValue = lines.reduce((sum, line) => sum + Number(line.lineTotal), 0) || 1;
                allocations = lines.map(line => ({
                    lineId: line.id,
                    allocatedCost: (Number(line.lineTotal) / totalValue) * totalLandedCost
                }));
            }
            // Update purchase order to mark costs as allocated
            await prisma.purchaseOrder.update({
                where: { id: shipment.purchaseOrderId },
                data: { landedCostAllocated: true }
            });
            // Best-effort audit log
            try {
                await prisma.auditLog.create({
                    data: {
                        tenantId: req.tenantId,
                        userId: req.userId || 'system',
                        action: 'landed_cost_allocation',
                        entityType: 'import_shipment',
                        entityId: id,
                        userAgent: req.headers?.['user-agent'] || '',
                        ipAddress: req.ip,
                    }
                });
            }
            catch { }
            res.json({
                shipmentId: id,
                totalLandedCost,
                allocationMethod,
                allocations
            });
        }
        catch (error) {
            console.error('Error allocating landed costs:', error);
            res.status(500).json({ error: 'Failed to allocate landed costs' });
        }
    });
    // Get import shipment statistics
    router.get('/import-shipments/stats', async (req, res) => {
        const companyId = String(req.query.companyId || '');
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        try {
            const where = {
                tenantId: req.tenantId,
                companyId,
                shipmentDate: {
                    gte: startDate ? new Date(startDate) : undefined,
                    lte: endDate ? new Date(endDate) : undefined
                }
            };
            const shipments = await prisma.importShipment.findMany({
                where,
                include: {
                    purchaseOrder: { include: { vendor: true } }
                }
            });
            const stats = {
                totalShipments: shipments.length,
                totalLandedCost: shipments.reduce((sum, s) => sum + Number(s.totalLandedCost), 0),
                averageTransitTime: 0,
                statusBreakdown: {
                    pending: 0,
                    in_transit: 0,
                    arrived: 0,
                    cleared: 0,
                    delivered: 0
                },
                topCarriers: [],
                topOrigins: []
            };
            // Calculate status breakdown
            shipments.forEach(shipment => {
                stats.statusBreakdown[shipment.status]++;
            });
            // Calculate average transit time
            const completedShipments = shipments.filter(s => s.actualArrival && s.shipmentDate);
            if (completedShipments.length > 0) {
                const totalDays = completedShipments.reduce((sum, s) => {
                    const days = Math.ceil((s.actualArrival.getTime() - s.shipmentDate.getTime()) / (1000 * 60 * 60 * 24));
                    return sum + days;
                }, 0);
                stats.averageTransitTime = totalDays / completedShipments.length;
            }
            // Top carriers
            const carrierCounts = {};
            shipments.forEach(shipment => {
                if (shipment.carrier) {
                    carrierCounts[shipment.carrier] = (carrierCounts[shipment.carrier] || 0) + 1;
                }
            });
            stats.topCarriers = Object.entries(carrierCounts)
                .map(([carrier, count]) => ({ carrier, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
            res.json(stats);
        }
        catch (error) {
            console.error('Error fetching import shipment statistics:', error);
            res.status(500).json({ error: 'Failed to fetch import shipment statistics' });
        }
    });
    // Delete import shipment
    router.delete('/import-shipments/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const shipment = await prisma.importShipment.findFirst({
                where: { id, tenantId: req.tenantId }
            });
            if (!shipment) {
                return res.status(404).json({ error: 'Import shipment not found' });
            }
            if (shipment.status !== 'pending') {
                return res.status(400).json({ error: 'Cannot delete shipment that is not pending' });
            }
            await prisma.importShipment.delete({
                where: { id }
            });
            res.json({ message: 'Import shipment deleted successfully' });
        }
        catch (error) {
            console.error('Error deleting import shipment:', error);
            res.status(500).json({ error: 'Failed to delete import shipment' });
        }
    });
}
