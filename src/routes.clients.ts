import { Request, Response, Router } from 'express';
import { asyncHandler } from './errors';
import { prisma } from './prisma';

const router = Router();

// Create a new client
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.header('x-tenant-id') || 'default';
    const companyId = req.header('x-company-id') || 'default';
    
    const {
      name,
      email,
      phone,
      businessName,
      contactPerson,
      industry,
      website,
      address,
      city,
      state,
      postalCode,
      country,
      currency,
      paymentTerms,
      creditLimit,
      taxNumber,
      hasPortalAccess,
      emailNotifications,
      smsNotifications,
      preferredLanguage,
      notes,
      tags,
      source,
      assignedTo
    } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    console.log('Creating client with Prisma:', { tenantId, companyId, name, email });
    
    // Ensure the company exists
    let company = await prisma.company.findFirst({
      where: { id: companyId, tenantId }
    });
    
    if (!company) {
      company = await prisma.company.create({
        data: {
          id: companyId,
          tenantId,
          name: 'Default Company',
          currency: 'USD'
        }
      });
      console.log('Created default company:', company);
    }
    
    // Create the client
    const client = await prisma.client.create({
      data: {
        tenantId,
        companyId,
        name,
        email,
        phone: phone || null,
        businessName: businessName || null,
        contactPerson: contactPerson || null,
        industry: industry || null,
        website: website || null,
        address: address || null,
        city: city || null,
        state: state || null,
        postalCode: postalCode || null,
        country: country || null,
        currency: currency || 'USD',
        paymentTerms: paymentTerms || null,
        creditLimit: creditLimit ? parseFloat(creditLimit.toString()) : null,
        taxNumber: taxNumber || null,
        hasPortalAccess: hasPortalAccess !== undefined ? hasPortalAccess : true,
        emailNotifications: emailNotifications !== undefined ? emailNotifications : true,
        smsNotifications: smsNotifications !== undefined ? smsNotifications : false,
        preferredLanguage: preferredLanguage || 'en',
        notes: notes || null,
        tags: tags || null,
        source: source || null,
        assignedTo: assignedTo || null,
        isActive: true
      }
    });
    
    console.log('Client created successfully:', client);
    res.status(201).json(client);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Client creation error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        res.status(400).json({ error: 'A client with this email already exists' });
      } else if (error.message.includes('Foreign key constraint')) {
        res.status(400).json({ error: 'Invalid company or user reference' });
      } else {
        res.status(500).json({ error: errorMessage });
      }
    } else {
      res.status(500).json({ error: 'An unexpected error occurred while creating the client' });
    }
  }
}));

// Get all clients for a company
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.header('x-tenant-id') || 'default';
    const companyId = req.header('x-company-id') || 'default';
    
    console.log('Fetching clients from database for:', { tenantId, companyId });
    
    const clients = await prisma.client.findMany({
      where: {
        tenantId,
        companyId
      },
      include: {
        assignedUser: {
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
    
    console.log('Found clients in database:', clients.length);
    res.json({ clients });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Clients fetch error:', errorMessage);
    res.status(500).json({ error: errorMessage });
  }
}));

// Get a specific client by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.header('x-tenant-id') || 'default';
    const companyId = req.header('x-company-id') || 'default';
    const { id } = req.params;
    
    const client = await prisma.client.findFirst({
      where: {
        id,
        tenantId,
        companyId
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        portalAccessRecords: true
      }
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    res.json(client);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Client fetch error:', errorMessage);
    res.status(500).json({ error: errorMessage });
  }
}));

// Update a client
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.header('x-tenant-id') || 'default';
    const companyId = req.header('x-company-id') || 'default';
    const { id } = req.params;
    
    const updateData = { ...req.body };
    delete updateData.id;
    delete updateData.tenantId;
    delete updateData.companyId;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    
    // Handle creditLimit conversion
    if (updateData.creditLimit) {
      updateData.creditLimit = parseFloat(updateData.creditLimit.toString());
    }
    
    const client = await prisma.client.update({
      where: {
        id,
        tenantId,
        companyId
      },
      data: updateData,
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    console.log('Client updated successfully:', client);
    res.json(client);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Client update error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Record to update not found')) {
        res.status(404).json({ error: 'Client not found' });
      } else if (error.message.includes('Unique constraint')) {
        res.status(400).json({ error: 'A client with this email already exists' });
      } else {
        res.status(500).json({ error: errorMessage });
      }
    } else {
      res.status(500).json({ error: 'An unexpected error occurred while updating the client' });
    }
  }
}));

// Delete a client (soft delete by setting isActive to false)
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.header('x-tenant-id') || 'default';
    const companyId = req.header('x-company-id') || 'default';
    const { id } = req.params;
    
    const client = await prisma.client.update({
      where: {
        id,
        tenantId,
        companyId
      },
      data: {
        isActive: false
      }
    });
    
    console.log('Client deactivated successfully:', client);
    res.json({ message: 'Client deactivated successfully' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Client deletion error:', error);
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      res.status(404).json({ error: 'Client not found' });
    } else {
      res.status(500).json({ error: errorMessage });
    }
  }
}));

// Share document with client
router.post('/:id/share-document', asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.header('x-tenant-id') || 'default';
    const companyId = req.header('x-company-id') || 'default';
    const { id: clientId } = req.params;
    const { documentId, message, expiresAt } = req.body;
    
    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }
    
    // Validate client exists
    const client = await prisma.client.findFirst({
      where: { id: clientId, tenantId, companyId }
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    
    // Validate document exists
    const document = await prisma.fileAsset.findFirst({
      where: { id: documentId, tenantId }
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Get current user ID for sharedWith field (required foreign key)
    const currentUserId = req.header('x-user-id') || 'system';
    
    // Validate that the user exists
    let validUserId = currentUserId;
    if (currentUserId !== 'system') {
      const user = await prisma.appUser.findFirst({
        where: { id: currentUserId, tenantId }
      });
      if (!user) {
        // Fallback to finding any user in the tenant
        const anyUser = await prisma.appUser.findFirst({
          where: { tenantId }
        });
        validUserId = anyUser?.id || 'system';
      }
    }
    
    // For system user, we need to create a system user record or use existing one
    if (validUserId === 'system') {
      let systemUser = await prisma.appUser.findFirst({
        where: { email: 'system@urutiiq.com', tenantId }
      });
      
      if (!systemUser) {
        systemUser = await prisma.appUser.create({
          data: {
            tenantId,
            email: 'system@urutiiq.com',
            name: 'System User',
            role: 'admin',
            passwordHash: 'system',
            passwordSalt: 'system',
            mfaEnabled: false
          }
        });
      }
      validUserId = systemUser.id;
    }

    // Create document share record with valid user ID and store client info in permissions field
    const documentShare = await prisma.documentShare.create({
      data: {
        tenantId,
        companyId,
        documentId,
        sharedWith: validUserId, // Valid user ID for foreign key
        permissions: `read:client:${clientId}${message ? `:${message}` : ''}`, // Encode client ID and message in permissions
        status: 'active',
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });
    
    console.log('Document shared successfully:', documentShare);
    res.status(201).json(documentShare);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Document sharing error:', error);
    res.status(500).json({ error: errorMessage });
  }
}));

// Get shared documents for a client
router.get('/:id/documents', asyncHandler(async (req: Request, res: Response) => {
  try {
    const tenantId = req.header('x-tenant-id') || 'default';
    const companyId = req.header('x-company-id') || 'default';
    const { id: clientId } = req.params;
    
    console.log('=== GET SHARED DOCUMENTS DEBUG ===');
    console.log('Request params:', { tenantId, companyId, clientId });
    console.log('Searching for permissions containing:', `client:${clientId}`);
    
    const sharedDocuments = await prisma.documentShare.findMany({
      where: {
        tenantId,
        companyId,
        permissions: { contains: `client:${clientId}` }, // Match our client ID encoding in permissions
        status: 'active',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        document: {
          select: {
            id: true,
            name: true,
            displayName: true,
            description: true,
            mimeType: true,
            sizeBytes: true,
            uploadedAt: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        sharedAt: 'desc'
      }
    });
    
    console.log('Found shared documents:', sharedDocuments.length);
    console.log('Documents:', sharedDocuments.map(doc => ({
      id: doc.id,
      permissions: doc.permissions,
      documentName: doc.document?.name || doc.document?.displayName,
      status: doc.status,
      expiresAt: doc.expiresAt
    })));
    console.log('=== END DEBUG ===');
    
    res.json({ documents: sharedDocuments });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Shared documents fetch error:', errorMessage);
    res.status(500).json({ error: errorMessage });
  }
}));

export default router;
