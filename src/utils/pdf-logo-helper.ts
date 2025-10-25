import PDFDocument from 'pdfkit';
import mongoService from '../config/mongodb.js';
import { ObjectId } from 'mongodb';
import { prisma } from '../prisma.js';

/**
 * Helper function to add company logo to PDF documents
 * @param doc - PDFDocument instance
 * @param company - Company object with logoUrl
 * @param x - X position for logo
 * @param y - Y position for logo
 * @param width - Logo width
 * @param height - Logo height
 * @returns Promise<boolean> - true if logo was added, false otherwise
 */
export async function addCompanyLogoToPDF(
  doc: PDFDocument, 
  company: any, 
  x: number = 50, 
  y: number = 50, 
  width: number = 60, 
  height: number = 60
): Promise<boolean> {
  try {
    if (!company?.logoUrl) {
      console.log('No company logo URL found');
      return false;
    }

    // Extract file ID from logo URL (format: /api/images/{fileId})
    const logoUrl = company.logoUrl;
    const fileIdMatch = logoUrl.match(/\/api\/images\/(.+)$/);
    
    if (!fileIdMatch) {
      console.log('Invalid logo URL format:', logoUrl);
      return false;
    }

    const fileId = fileIdMatch[1];
    console.log('Extracting logo for PDF:', { fileId, logoUrl });

    // Validate ObjectId
    if (!ObjectId.isValid(fileId)) {
      console.log('Invalid ObjectId for logo:', fileId);
      return false;
    }

    // Get GridFS instance
    const gridFS = mongoService.getGridFS();
    
    // Create download stream
    const downloadStream = gridFS.openDownloadStream(new ObjectId(fileId));
    
    // Convert stream to buffer
    const chunks: Buffer[] = [];
    
    return new Promise((resolve) => {
      downloadStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      
      downloadStream.on('end', () => {
        try {
          const logoBuffer = Buffer.concat(chunks);
          
          // Add image to PDF
          doc.image(logoBuffer, x, y, { width, height });
          
          console.log('✅ Company logo added to PDF successfully');
          resolve(true);
        } catch (error) {
          console.error('❌ Error adding logo to PDF:', error);
          resolve(false);
        }
      });
      
      downloadStream.on('error', (error) => {
        console.error('❌ Error downloading logo:', error);
        resolve(false);
      });
    });

  } catch (error) {
    console.error('❌ Error in addCompanyLogoToPDF:', error);
    return false;
  }
}

/**
 * Helper function to get company data with logo for PDF generation
 * @param tenantId - Tenant ID
 * @param companyId - Company ID
 * @returns Promise<any> - Company object with logoUrl
 */
export async function getCompanyForPDF(tenantId: string, companyId: string): Promise<any> {
  try {
    const company = await prisma.company.findFirst({
      where: { id: companyId, tenantId },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        address: true,
        city: true,
        state: true,
        postalCode: true,
        email: true,
        phone: true,
        industry: true
      }
    });

    return company;
  } catch (error) {
    console.error('❌ Error fetching company for PDF:', error);
    return null;
  }
}
