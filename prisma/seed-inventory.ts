import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SeedInventoryDataParams {
  tenantId: string;
  companyId: string;
}

export async function seedInventoryData({ tenantId, companyId }: SeedInventoryDataParams) {
  console.log(`🌱 Seeding inventory data for company ${companyId}...`);

  // Check if inventory data already exists
  const existingProducts = await prisma.product.count({ where: { tenantId, companyId } });
  if (existingProducts > 0) {
    console.log(`✅ Inventory data already exists for company ${companyId}`);
    return;
  }

  // Create locations first
  const locations = await createLocations(tenantId, companyId);
  
  // Create products
  const products = await createProducts(tenantId, companyId);
  
  // Create product-location relationships
  await createProductLocations(tenantId, companyId, products, locations);
  
  // Create inventory movements
  await createInventoryMovements(tenantId, companyId, products, locations);
  
  // Create reorder alerts
  await createReorderAlerts(tenantId, companyId, products, locations);

  console.log(`✅ Inventory data seeded successfully for company ${companyId}`);
}

async function createLocations(tenantId: string, companyId: string) {
  const locations = [
    {
      name: "Main Warehouse",
      code: "WH001",
      type: "warehouse",
      address: "123 Industrial Blvd",
      city: "San Francisco",
      state: "CA",
      postalCode: "94107",
      country: "US",
      contactName: "John Smith",
      contactPhone: "+1-555-0101",
      contactEmail: "warehouse@company.com",
      isDefault: true,
      isActive: true
    },
    {
      name: "Retail Store Downtown",
      code: "ST001",
      type: "store",
      address: "456 Main Street",
      city: "San Francisco",
      state: "CA",
      postalCode: "94102",
      country: "US",
      contactName: "Sarah Johnson",
      contactPhone: "+1-555-0102",
      contactEmail: "store@company.com",
      isDefault: false,
      isActive: true
    },
    {
      name: "Distribution Center",
      code: "DC001",
      type: "distribution",
      address: "789 Logistics Way",
      city: "Oakland",
      state: "CA",
      postalCode: "94607",
      country: "US",
      contactName: "Mike Chen",
      contactPhone: "+1-555-0103",
      contactEmail: "distribution@company.com",
      isDefault: false,
      isActive: true
    },
    {
      name: "Office Supplies Storage",
      code: "OS001",
      type: "office",
      address: "321 Business Park",
      city: "San Francisco",
      state: "CA",
      postalCode: "94105",
      country: "US",
      contactName: "Lisa Davis",
      contactPhone: "+1-555-0104",
      contactEmail: "office@company.com",
      isDefault: false,
      isActive: true
    }
  ];

  const createdLocations = [];
  for (const location of locations) {
    const created = await prisma.location.create({
      data: {
        tenantId,
        companyId,
        ...location
      }
    });
    createdLocations.push(created);
  }

  return createdLocations;
}

async function createProducts(tenantId: string, companyId: string) {
  const products = [
    {
      name: "Wireless Bluetooth Headphones",
      sku: "WBH-001",
      description: "High-quality wireless headphones with noise cancellation featuring advanced Bluetooth 5.0 technology",
      shortDescription: "Premium wireless headphones with noise cancellation",
      type: "PRODUCT",
      unitPrice: 199.99,
      costPrice: 120.00,
      stockQuantity: 150,
      reservedQuantity: 0,
      availableQuantity: 150,
      minStockLevel: 20,
      maxStockLevel: 300,
      reorderPoint: 30,
      reorderQuantity: 100,
      brand: "TechSound",
      model: "TS-BT500",
      tags: "bluetooth,wireless,headphones,audio,noise-cancellation",
      weight: 0.28,
      dimensionsLength: 20.5,
      dimensionsWidth: 18.2,
      dimensionsHeight: 8.5,
      barcode: "1234567890123",
      trackSerialNumbers: false,
      trackBatches: false,
      costingMethod: "FIFO",
      taxRate: 8.5,
      taxInclusive: false,
      isDigital: false,
      isService: false,
      isPhysical: true,
      trackInventory: true,
      allowBackorder: true,
      allowPreorder: false,
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: true,
      warrantyPeriod: 24,
      warrantyUnit: "MONTHS",
      returnPolicy: "30-day return policy",
      shippingClass: "standard",
      seoTitle: "Premium Wireless Bluetooth Headphones - Noise Cancelling",
      seoDescription: "Experience crystal clear audio with our premium wireless headphones featuring advanced noise cancellation",
      metaKeywords: "wireless headphones,bluetooth,noise cancelling,audio",
      images: JSON.stringify(["/images/headphones-1.jpg", "/images/headphones-2.jpg"]),
      variants: JSON.stringify([
        { color: "Black", price: 199.99 },
        { color: "White", price: 209.99 },
        { color: "Silver", price: 219.99 }
      ]),
      customFields: JSON.stringify({
        batteryLife: "30 hours",
        chargingTime: "2 hours",
        bluetoothVersion: "5.0"
      }),
      status: "ACTIVE"
    },
    {
      name: "Ergonomic Office Chair",
      sku: "EOC-002", 
      description: "Comfortable ergonomic office chair with lumbar support designed for all-day comfort and productivity",
      shortDescription: "Ergonomic office chair with lumbar support",
      type: "PRODUCT",
      unitPrice: 299.99,
      costPrice: 180.00,
      stockQuantity: 45,
      reservedQuantity: 0,
      availableQuantity: 45,
      minStockLevel: 5,
      maxStockLevel: 100,
      reorderPoint: 10,
      reorderQuantity: 25,
      brand: "ErgoWork",
      model: "EW-C300",
      tags: "chair,office,ergonomic,furniture,workspace",
      weight: 22.5,
      dimensionsLength: 65.0,
      dimensionsWidth: 65.0,
      dimensionsHeight: 120.0,
      barcode: "1234567890124",
      trackSerialNumbers: true,
      trackBatches: false,
      costingMethod: "FIFO",
      taxRate: 8.5,
      taxInclusive: false,
      isDigital: false,
      isService: false,
      isPhysical: true,
      trackInventory: true,
      allowBackorder: false,
      allowPreorder: true,
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: false,
      warrantyPeriod: 5,
      warrantyUnit: "YEARS",
      returnPolicy: "30-day return policy with free pickup",
      shippingClass: "heavy",
      seoTitle: "Ergonomic Office Chair with Lumbar Support - Professional Grade",
      seoDescription: "Transform your workspace with our premium ergonomic office chair featuring adjustable lumbar support",
      metaKeywords: "office chair,ergonomic,lumbar support,furniture",
      images: JSON.stringify(["/images/chair-1.jpg", "/images/chair-2.jpg", "/images/chair-3.jpg"]),
      variants: JSON.stringify([
        { color: "Black", armrests: "Adjustable", price: 299.99 },
        { color: "Gray", armrests: "Fixed", price: 279.99 },
        { color: "Blue", armrests: "Adjustable", price: 319.99 }
      ]),
      customFields: JSON.stringify({
        maxWeight: "150kg",
        seatMaterial: "Mesh",
        wheelType: "Carpet casters"
      }),
      status: "ACTIVE"
    },
    {
      name: "USB-C Hub Multi-Port",
      sku: "UCH-003",
      description: "Multi-port USB-C hub with HDMI, USB 3.0, and SD card reader for enhanced connectivity",
      shortDescription: "Multi-port USB-C hub with HDMI and USB 3.0",
      type: "PRODUCT",
      unitPrice: 89.99,
      costPrice: 45.00,
      stockQuantity: 200,
      reservedQuantity: 0,
      availableQuantity: 200,
      minStockLevel: 30,
      maxStockLevel: 500,
      reorderPoint: 50,
      reorderQuantity: 150,
      brand: "ConnectPro",
      model: "CP-HUB7",
      tags: "usb,hub,connectivity,electronics,adapter",
      weight: 0.15,
      dimensionsLength: 12.0,
      dimensionsWidth: 4.5,
      dimensionsHeight: 1.8,
      barcode: "1234567890125",
      trackSerialNumbers: false,
      trackBatches: false,
      costingMethod: "FIFO",
      taxRate: 8.5,
      taxInclusive: false,
      isDigital: false,
      isService: false,
      isPhysical: true,
      trackInventory: true,
      allowBackorder: true,
      allowPreorder: false,
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: false,
      warrantyPeriod: 12,
      warrantyUnit: "MONTHS",
      returnPolicy: "30-day return policy",
      shippingClass: "standard",
      seoTitle: "USB-C Multi-Port Hub - 7-in-1 Connectivity Solution",
      seoDescription: "Expand your connectivity with our versatile USB-C hub featuring HDMI, USB 3.0, and SD card slots",
      metaKeywords: "usb hub,usb-c,hdmi,connectivity,adapter",
      images: JSON.stringify(["/images/hub-1.jpg", "/images/hub-2.jpg"]),
      variants: JSON.stringify([
        { ports: "7-in-1", color: "Silver", price: 89.99 },
        { ports: "5-in-1", color: "Space Gray", price: 69.99 }
      ]),
      customFields: JSON.stringify({
        supportedResolution: "4K@60Hz",
        dataTransferRate: "5Gbps",
        powerDelivery: "100W"
      }),
      status: "ACTIVE"
    },
    {
      name: "Standing Desk Converter",
      sku: "SDC-004",
      description: "Adjustable standing desk converter for home office to promote healthy working posture",
      shortDescription: "Adjustable standing desk converter",
      type: "PRODUCT",
      unitPrice: 249.99,
      costPrice: 150.00,
      stockQuantity: 30,
      reservedQuantity: 0,
      availableQuantity: 30,
      minStockLevel: 3,
      maxStockLevel: 60,
      reorderPoint: 8,
      reorderQuantity: 20,
      brand: "StandUp",
      model: "SU-DC400",
      tags: "desk,standing,converter,ergonomic,health",
      weight: 8.5,
      dimensionsLength: 80.0,
      dimensionsWidth: 50.0,
      dimensionsHeight: 15.0,
      barcode: "1234567890126",
      trackSerialNumbers: false,
      trackBatches: false,
      costingMethod: "FIFO",
      taxRate: 8.5,
      taxInclusive: false,
      isDigital: false,
      isService: false,
      isPhysical: true,
      trackInventory: true,
      allowBackorder: false,
      allowPreorder: true,
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: false,
      warrantyPeriod: 3,
      warrantyUnit: "YEARS",
      returnPolicy: "30-day return policy with free return shipping",
      shippingClass: "heavy",
      seoTitle: "Adjustable Standing Desk Converter - Ergonomic Workspace Solution",
      seoDescription: "Transform any desk into a standing desk with our adjustable converter for better health and productivity",
      metaKeywords: "standing desk,desk converter,ergonomic,workspace,health",
      images: JSON.stringify(["/images/desk-converter-1.jpg", "/images/desk-converter-2.jpg"]),
      variants: JSON.stringify([
        { size: "Small (32 inch)", price: 199.99 },
        { size: "Medium (36 inch)", price: 249.99 },
        { size: "Large (42 inch)", price: 299.99 }
      ]),
      customFields: JSON.stringify({
        heightRange: "4-20 inches",
        maxMonitors: "Dual 24 inch",
        weightCapacity: "35 lbs"
      }),
      status: "ACTIVE"
    },
    {
      name: "Mechanical Keyboard",
      sku: "MKB-005",
      description: "RGB mechanical keyboard with Cherry MX switches for gaming and professional use",
      shortDescription: "RGB mechanical keyboard with Cherry MX switches",
      type: "PRODUCT",
      unitPrice: 149.99,
      costPrice: 80.00,
      stockQuantity: 75,
      reservedQuantity: 0,
      availableQuantity: 75,
      minStockLevel: 10,
      maxStockLevel: 150,
      reorderPoint: 20,
      reorderQuantity: 50,
      brand: "KeyMaster",
      model: "KM-RGB100",
      tags: "keyboard,mechanical,rgb,gaming,cherry-mx",
      weight: 1.2,
      dimensionsLength: 44.0,
      dimensionsWidth: 13.5,
      dimensionsHeight: 3.8,
      barcode: "1234567890127",
      trackSerialNumbers: false,
      trackBatches: false,
      costingMethod: "FIFO",
      taxRate: 8.5,
      taxInclusive: false,
      isDigital: false,
      isService: false,
      isPhysical: true,
      trackInventory: true,
      allowBackorder: true,
      allowPreorder: false,
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: false,
      warrantyPeriod: 24,
      warrantyUnit: "MONTHS",
      returnPolicy: "30-day return policy",
      shippingClass: "standard",
      seoTitle: "Mechanical RGB Keyboard with Cherry MX Switches - Gaming & Professional",
      seoDescription: "Experience premium typing with our mechanical keyboard featuring Cherry MX switches and customizable RGB lighting",
      metaKeywords: "mechanical keyboard,cherry mx,rgb,gaming keyboard",
      images: JSON.stringify(["/images/keyboard-1.jpg", "/images/keyboard-2.jpg"]),
      variants: JSON.stringify([
        { switch: "Cherry MX Blue", backlight: "RGB", price: 149.99 },
        { switch: "Cherry MX Red", backlight: "RGB", price: 159.99 },
        { switch: "Cherry MX Brown", backlight: "White", price: 139.99 }
      ]),
      customFields: JSON.stringify({
        switchType: "Cherry MX",
        backlighting: "RGB",
        connectivity: "USB-A"
      }),
      status: "ACTIVE"
    },
    {
      name: "Monitor Stand",
      sku: "MS-006",
      description: "Adjustable monitor stand with cable management for organized workspace setup",
      shortDescription: "Adjustable monitor stand with cable management",
      type: "PRODUCT",
      unitPrice: 79.99,
      costPrice: 35.00,
      stockQuantity: 120,
      reservedQuantity: 0,
      availableQuantity: 120,
      minStockLevel: 15,
      maxStockLevel: 200,
      reorderPoint: 25,
      reorderQuantity: 75,
      brand: "ViewRise",
      model: "VR-MS200",
      tags: "monitor,stand,desk,accessories,cable-management",
      weight: 2.8,
      dimensionsLength: 52.0,
      dimensionsWidth: 23.0,
      dimensionsHeight: 15.0,
      barcode: "1234567890128",
      trackSerialNumbers: false,
      trackBatches: false,
      costingMethod: "FIFO",
      taxRate: 8.5,
      taxInclusive: false,
      isDigital: false,
      isService: false,
      isPhysical: true,
      trackInventory: true,
      allowBackorder: true,
      allowPreorder: false,
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: false,
      warrantyPeriod: 12,
      warrantyUnit: "MONTHS",
      returnPolicy: "30-day return policy",
      shippingClass: "standard",
      seoTitle: "Adjustable Monitor Stand with Cable Management - Desk Organization",
      seoDescription: "Organize your workspace with our adjustable monitor stand featuring integrated cable management system",
      metaKeywords: "monitor stand,desk accessories,cable management,workspace organization",
      images: JSON.stringify(["/images/monitor-stand-1.jpg", "/images/monitor-stand-2.jpg"]),
      customFields: JSON.stringify({
        maxMonitorSize: "32 inches",
        weightCapacity: "22 lbs",
        heightAdjustment: "2.4-5.1 inches"
      }),
      status: "ACTIVE"
    },
    {
      name: "Desk Lamp LED",
      sku: "DL-007",
      description: "LED desk lamp with adjustable brightness and color temperature for optimal lighting",
      shortDescription: "LED desk lamp with adjustable brightness and color",
      type: "PRODUCT",
      unitPrice: 59.99,
      costPrice: 25.00,
      stockQuantity: 80,
      reservedQuantity: 0,
      availableQuantity: 80,
      minStockLevel: 10,
      maxStockLevel: 150,
      reorderPoint: 20,
      reorderQuantity: 60,
      brand: "LuminaTech",
      model: "LT-LED300",
      tags: "lamp,led,lighting,desk,adjustable,office",
      weight: 0.95,
      dimensionsLength: 45.0,
      dimensionsWidth: 15.0,
      dimensionsHeight: 50.0,
      barcode: "1234567890129",
      trackSerialNumbers: false,
      trackBatches: false,
      costingMethod: "FIFO",
      taxRate: 8.5,
      taxInclusive: false,
      isDigital: false,
      isService: false,
      isPhysical: true,
      trackInventory: true,
      allowBackorder: true,
      allowPreorder: false,
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,
      warrantyPeriod: 18,
      warrantyUnit: "MONTHS",
      returnPolicy: "30-day return policy",
      shippingClass: "standard",
      seoTitle: "LED Desk Lamp - Adjustable Brightness & Color Temperature",
      seoDescription: "Perfect lighting for any task with our adjustable LED desk lamp featuring multiple brightness levels",
      metaKeywords: "led lamp,desk lighting,adjustable brightness,office lighting",
      images: JSON.stringify(["/images/desk-lamp-1.jpg", "/images/desk-lamp-2.jpg"]),
      customFields: JSON.stringify({
        powerConsumption: "12W",
        colorTemperature: "3000K-6500K",
        brightnesLevels: "5 levels"
      }),
      status: "ACTIVE"
    },
    {
      name: "Wireless Mouse",
      sku: "WM-008",
      description: "Ergonomic wireless mouse with precision tracking for comfortable computing",
      shortDescription: "Ergonomic wireless mouse with precision tracking",
      type: "PRODUCT",
      unitPrice: 39.99,
      costPrice: 18.00,
      stockQuantity: 300,
      reservedQuantity: 0,
      availableQuantity: 300,
      minStockLevel: 50,
      maxStockLevel: 500,
      reorderPoint: 75,
      reorderQuantity: 200,
      brand: "ClickPro",
      model: "CP-WM150",
      tags: "mouse,wireless,ergonomic,computer,accessories",
      weight: 0.08,
      dimensionsLength: 10.5,
      dimensionsWidth: 6.2,
      dimensionsHeight: 3.8,
      barcode: "1234567890130",
      trackSerialNumbers: false,
      trackBatches: false,
      costingMethod: "FIFO",
      taxRate: 8.5,
      taxInclusive: false,
      isDigital: false,
      isService: false,
      isPhysical: true,
      trackInventory: true,
      allowBackorder: true,
      allowPreorder: false,
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: false,
      warrantyPeriod: 12,
      warrantyUnit: "MONTHS",
      returnPolicy: "30-day return policy",
      shippingClass: "standard",
      seoTitle: "Wireless Ergonomic Mouse - Precision Tracking & Comfort",
      seoDescription: "Experience comfortable computing with our ergonomic wireless mouse featuring precision optical tracking",
      metaKeywords: "wireless mouse,ergonomic mouse,computer accessories,optical mouse",
      images: JSON.stringify(["/images/mouse-1.jpg", "/images/mouse-2.jpg"]),
      variants: JSON.stringify([
        { color: "Black", dpi: "1600", price: 39.99 },
        { color: "White", dpi: "1600", price: 42.99 },
        { color: "Silver", dpi: "2400", price: 49.99 }
      ]),
      customFields: JSON.stringify({
        dpi: "800-2400",
        batteryLife: "18 months",
        connectivity: "2.4GHz wireless"
      }),
      status: "ACTIVE"
    },
    {
      name: "Laptop Stand",
      sku: "LS-009",
      description: "Adjustable aluminum laptop stand for better ergonomics and heat dissipation",
      shortDescription: "Adjustable aluminum laptop stand",
      type: "PRODUCT",
      unitPrice: 49.99,
      costPrice: 22.00,
      stockQuantity: 60,
      reservedQuantity: 0,
      availableQuantity: 60,
      minStockLevel: 8,
      maxStockLevel: 120,
      reorderPoint: 15,
      reorderQuantity: 40,
      brand: "LiftTech",
      model: "LT-AS100",
      tags: "laptop,stand,aluminum,ergonomic,portable",
      weight: 1.1,
      dimensionsLength: 26.0,
      dimensionsWidth: 22.0,
      dimensionsHeight: 4.0,
      barcode: "1234567890131",
      trackSerialNumbers: false,
      trackBatches: false,
      costingMethod: "FIFO",
      taxRate: 8.5,
      taxInclusive: false,
      isDigital: false,
      isService: false,
      isPhysical: true,
      trackInventory: true,
      allowBackorder: true,
      allowPreorder: false,
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: false,
      warrantyPeriod: 24,
      warrantyUnit: "MONTHS",
      returnPolicy: "30-day return policy",
      shippingClass: "standard",
      seoTitle: "Adjustable Aluminum Laptop Stand - Ergonomic & Portable",
      seoDescription: "Improve your posture and laptop performance with our adjustable aluminum stand",
      metaKeywords: "laptop stand,aluminum,ergonomic,portable,laptop accessories",
      images: JSON.stringify(["/images/laptop-stand-1.jpg", "/images/laptop-stand-2.jpg"]),
      customFields: JSON.stringify({
        material: "Aluminum alloy",
        compatibility: "11-17 inch laptops",
        foldable: "Yes"
      }),
      status: "ACTIVE"
    },
    {
      name: "Webcam HD",
      sku: "WC-010",
      description: "1080p HD webcam with built-in microphone for video conferencing",
      shortDescription: "1080p HD webcam with built-in microphone",
      type: "PRODUCT",
      unitPrice: 79.99,
      costPrice: 35.00,
      stockQuantity: 50,
      reservedQuantity: 0,
      availableQuantity: 50,
      minStockLevel: 15,
      maxStockLevel: 100,
      reorderPoint: 25,
      reorderQuantity: 50,
      brand: "StreamVision",
      model: "SV-HD1080",
      tags: "webcam,hd,microphone,video-conferencing,streaming",
      weight: 0.16,
      dimensionsLength: 9.0,
      dimensionsWidth: 3.0,
      dimensionsHeight: 5.5,
      barcode: "1234567890132",
      trackSerialNumbers: false,
      trackBatches: false,
      costingMethod: "FIFO",
      taxRate: 8.5,
      taxInclusive: false,
      isDigital: false,
      isService: false,
      isPhysical: true,
      trackInventory: true,
      allowBackorder: true,
      allowPreorder: true,
      preorderDate: new Date('2025-11-01'),
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,
      warrantyPeriod: 12,
      warrantyUnit: "MONTHS",
      returnPolicy: "30-day return policy",
      shippingClass: "standard",
      seoTitle: "HD Webcam 1080p with Built-in Microphone - Video Conferencing",
      seoDescription: "Crystal clear video calls with our 1080p HD webcam featuring integrated noise-cancelling microphone",
      metaKeywords: "webcam,hd camera,video conferencing,streaming,microphone",
      images: JSON.stringify(["/images/webcam-1.jpg", "/images/webcam-2.jpg"]),
      customFields: JSON.stringify({
        resolution: "1920x1080",
        frameRate: "30fps",
        fieldOfView: "78 degrees"
      }),
      status: "ACTIVE"
    },
    {
      name: "Office Supplies Kit",
      sku: "OSK-011",
      description: "Complete office supplies kit with pens, notebooks, and essential stationery items",
      shortDescription: "Complete office supplies kit",
      type: "BUNDLE",
      unitPrice: 29.99,
      costPrice: 12.00,
      stockQuantity: 500,
      reservedQuantity: 0,
      availableQuantity: 500,
      minStockLevel: 50,
      maxStockLevel: 800,
      reorderPoint: 100,
      reorderQuantity: 250,
      brand: "OfficePro",
      model: "OP-KIT001",
      tags: "office-supplies,stationery,bundle,pens,notebooks",
      weight: 1.5,
      dimensionsLength: 25.0,
      dimensionsWidth: 20.0,
      dimensionsHeight: 8.0,
      barcode: "1234567890133",
      trackSerialNumbers: false,
      trackBatches: true,
      costingMethod: "FIFO",
      taxRate: 8.5,
      taxInclusive: false,
      isDigital: false,
      isService: false,
      isPhysical: true,
      trackInventory: true,
      allowBackorder: true,
      allowPreorder: false,
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: false,
      warrantyPeriod: 6,
      warrantyUnit: "MONTHS",
      returnPolicy: "30-day return policy",
      shippingClass: "standard",
      seoTitle: "Complete Office Supplies Kit - Essential Stationery Bundle",
      seoDescription: "Everything you need to get started with our comprehensive office supplies kit",
      metaKeywords: "office supplies,stationery kit,office bundle,pens,notebooks",
      images: JSON.stringify(["/images/office-kit-1.jpg", "/images/office-kit-2.jpg"]),
      customFields: JSON.stringify({
        contents: "Pens, pencils, notebooks, sticky notes, paper clips, stapler",
        itemCount: "25+ items",
        bundleType: "Starter kit"
      }),
      status: "ACTIVE"
    },
    {
      name: "Whiteboard 4x3",
      sku: "WB-012",
      description: "Magnetic whiteboard 4ft x 3ft with markers and eraser for presentations and planning",
      shortDescription: "Magnetic whiteboard 4ft x 3ft with accessories",
      type: "PRODUCT",
      unitPrice: 89.99,
      costPrice: 40.00,
      stockQuantity: 25,
      reservedQuantity: 0,
      availableQuantity: 25,
      minStockLevel: 3,
      maxStockLevel: 50,
      reorderPoint: 8,
      reorderQuantity: 20,
      brand: "WriteWell",
      model: "WW-WB43",
      tags: "whiteboard,magnetic,office,presentation,planning",
      weight: 5.2,
      dimensionsLength: 122.0,
      dimensionsWidth: 91.0,
      dimensionsHeight: 2.0,
      barcode: "1234567890134",
      trackSerialNumbers: false,
      trackBatches: false,
      costingMethod: "FIFO",
      taxRate: 8.5,
      taxInclusive: false,
      isDigital: false,
      isService: false,
      isPhysical: true,
      trackInventory: true,
      allowBackorder: false,
      allowPreorder: true,
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: false,
      warrantyPeriod: 36,
      warrantyUnit: "MONTHS",
      returnPolicy: "30-day return policy with free return shipping",
      shippingClass: "oversized",
      seoTitle: "Magnetic Whiteboard 4x3 ft with Markers - Office & Classroom",
      seoDescription: "Professional magnetic whiteboard perfect for offices, classrooms, and meeting rooms",
      metaKeywords: "whiteboard,magnetic board,office supplies,presentation board",
      images: JSON.stringify(["/images/whiteboard-1.jpg", "/images/whiteboard-2.jpg"]),
      customFields: JSON.stringify({
        surface: "Magnetic",
        mounting: "Wall mount",
        includes: "4 markers, eraser, mounting hardware"
      }),
      status: "ACTIVE"
    },
    {
      name: "Printer Paper A4",
      sku: "PP-013",
      description: "Premium A4 printer paper, 500 sheets per ream, 80gsm white multipurpose paper",
      shortDescription: "Premium A4 printer paper, 500 sheets per ream",
      type: "PRODUCT",
      unitPrice: 12.99,
      costPrice: 6.00,
      stockQuantity: 1000,
      reservedQuantity: 0,
      availableQuantity: 1000,
      minStockLevel: 100,
      maxStockLevel: 2000,
      reorderPoint: 200,
      reorderQuantity: 500,
      brand: "PaperPlus",
      model: "PP-A4-80",
      tags: "paper,printer,a4,office,supplies,white",
      weight: 2.5,
      dimensionsLength: 29.7,
      dimensionsWidth: 21.0,
      dimensionsHeight: 5.5,
      barcode: "1234567890135",
      trackSerialNumbers: false,
      trackBatches: true,
      costingMethod: "FIFO",
      taxRate: 8.5,
      taxInclusive: false,
      isDigital: false,
      isService: false,
      isPhysical: true,
      trackInventory: true,
      allowBackorder: true,
      allowPreorder: false,
      isFeatured: false,
      isBestSeller: true,
      isNewArrival: false,
      warrantyPeriod: 0,
      warrantyUnit: "MONTHS",
      returnPolicy: "30-day return policy",
      shippingClass: "heavy",
      seoTitle: "Premium A4 Printer Paper 80gsm - 500 Sheets Multipurpose",
      seoDescription: "High-quality A4 printer paper perfect for all your printing needs",
      metaKeywords: "a4 paper,printer paper,office paper,copy paper,multipurpose paper",
      images: JSON.stringify(["/images/paper-1.jpg"]),
      customFields: JSON.stringify({
        weight: "80gsm",
        brightness: "96%",
        opacity: "94%"
      }),
      status: "ACTIVE"
    },
    {
      name: "File Organizer",
      sku: "FO-014",
      description: "Desktop file organizer with multiple compartments for documents and supplies",
      shortDescription: "Desktop file organizer with multiple compartments",
      type: "PRODUCT",
      unitPrice: 19.99,
      costPrice: 8.00,
      stockQuantity: 200,
      reservedQuantity: 0,
      availableQuantity: 200,
      minStockLevel: 25,
      maxStockLevel: 300,
      reorderPoint: 50,
      reorderQuantity: 100,
      brand: "OrganizeIt",
      model: "OI-FO300",
      tags: "organizer,file,desktop,office,storage,documents",
      weight: 0.8,
      dimensionsLength: 32.0,
      dimensionsWidth: 25.0,
      dimensionsHeight: 13.0,
      barcode: "1234567890136",
      trackSerialNumbers: false,
      trackBatches: false,
      costingMethod: "FIFO",
      taxRate: 8.5,
      taxInclusive: false,
      isDigital: false,
      isService: false,
      isPhysical: true,
      trackInventory: true,
      allowBackorder: true,
      allowPreorder: false,
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: false,
      warrantyPeriod: 12,
      warrantyUnit: "MONTHS",
      returnPolicy: "30-day return policy",
      shippingClass: "standard",
      seoTitle: "Desktop File Organizer - Multi-Compartment Document Storage",
      seoDescription: "Keep your desk organized with our multi-compartment file organizer",
      metaKeywords: "file organizer,desk organizer,office storage,document organizer",
      images: JSON.stringify(["/images/organizer-1.jpg", "/images/organizer-2.jpg"]),
      customFields: JSON.stringify({
        compartments: "6 sections",
        material: "Bamboo wood",
        capacity: "Letter size documents"
      }),
      status: "ACTIVE"
    },
    {
      name: "Coffee Machine",
      sku: "CM-015",
      description: "Automatic coffee machine for office use with programmable settings and thermal carafe",
      shortDescription: "Automatic coffee machine for office use",
      type: "PRODUCT",
      unitPrice: 199.99,
      costPrice: 120.00,
      stockQuantity: 25,
      reservedQuantity: 0,
      availableQuantity: 25,
      minStockLevel: 2,
      maxStockLevel: 15,
      reorderPoint: 3,
      reorderQuantity: 8,
      brand: "BrewMaster",
      model: "BM-CM500",
      tags: "coffee,machine,office,automatic,appliance",
      weight: 4.5,
      dimensionsLength: 35.0,
      dimensionsWidth: 20.0,
      dimensionsHeight: 38.0,
      barcode: "1234567890137",
      trackSerialNumbers: true,
      trackBatches: false,
      costingMethod: "FIFO",
      taxRate: 8.5,
      taxInclusive: false,
      isDigital: false,
      isService: false,
      isPhysical: true,
      trackInventory: true,
      allowBackorder: false,
      allowPreorder: true,
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: false,
      warrantyPeriod: 24,
      warrantyUnit: "MONTHS",
      returnPolicy: "30-day return policy with free return shipping",
      shippingClass: "heavy",
      seoTitle: "Automatic Office Coffee Machine - Programmable with Thermal Carafe",
      seoDescription: "Professional coffee machine perfect for office environments with automatic brewing features",
      metaKeywords: "coffee machine,office coffee,automatic brewing,thermal carafe",
      images: JSON.stringify(["/images/coffee-machine-1.jpg", "/images/coffee-machine-2.jpg"]),
      customFields: JSON.stringify({
        capacity: "12 cups",
        features: "Programmable, auto shut-off, thermal carafe",
        powerConsumption: "1200W"
      }),
      status: "ACTIVE"
    },
    {
      name: "IT Support - 1 Hour",
      sku: "ITS-001",
      description: "Professional IT support and troubleshooting services for computer and network issues",
      shortDescription: "1-hour professional IT support service",
      type: "SERVICE",
      unitPrice: 85.00,
      costPrice: 0.00,
      stockQuantity: 50,
      reservedQuantity: 0,
      availableQuantity: 50,
      minStockLevel: 10,
      maxStockLevel: 100,
      reorderPoint: 20,
      reorderQuantity: 50,
      brand: "TechSupport Pro",
      model: "TSP-IT001",
      tags: "it-support,service,troubleshooting,computer,network",
      weight: 0,
      barcode: "1234567890138",
      trackSerialNumbers: false,
      trackBatches: false,
      costingMethod: "FIFO",
      taxRate: 8.5,
      taxInclusive: false,
      isDigital: false,
      isService: true,
      isPhysical: false,
      trackInventory: true,
      allowBackorder: false,
      allowPreorder: true,
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: false,
      warrantyPeriod: 0,
      warrantyUnit: "DAYS",
      returnPolicy: "100% satisfaction guarantee",
      shippingClass: "digital",
      seoTitle: "Professional IT Support Services - On-Site & Remote Troubleshooting",
      seoDescription: "Expert IT support for all your computer and network issues with guaranteed response time",
      metaKeywords: "it support,computer repair,network troubleshooting,technical support",
      images: JSON.stringify(["/images/it-support-1.jpg"]),
      customFields: JSON.stringify({
        duration: "1 hour",
        serviceType: "On-site or Remote",
        responseTime: "Within 4 hours",
        availability: "Business hours"
      }),
      status: "ACTIVE"
    },
    {
      name: "Business Consulting - Strategy Session",
      sku: "BC-001",
      description: "Professional business strategy consulting session to help optimize operations and growth",
      shortDescription: "2-hour business strategy consulting session",
      type: "SERVICE",
      unitPrice: 250.00,
      costPrice: 0.00,
      stockQuantity: 20,
      reservedQuantity: 0,
      availableQuantity: 20,
      minStockLevel: 5,
      maxStockLevel: 30,
      reorderPoint: 8,
      reorderQuantity: 15,
      brand: "Business Growth Partners",
      model: "BGP-STRAT001",
      tags: "consulting,business,strategy,growth,optimization",
      weight: 0,
      barcode: "1234567890139",
      trackSerialNumbers: false,
      trackBatches: false,
      costingMethod: "FIFO",
      taxRate: 8.5,
      taxInclusive: false,
      isDigital: false,
      isService: true,
      isPhysical: false,
      trackInventory: true,
      allowBackorder: false,
      allowPreorder: true,
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: false,
      warrantyPeriod: 0,
      warrantyUnit: "DAYS",
      returnPolicy: "Satisfaction guaranteed or full refund",
      shippingClass: "digital",
      seoTitle: "Business Strategy Consulting - Professional Growth Advisory Services",
      seoDescription: "Transform your business with expert strategy consulting focused on growth and operational efficiency",
      metaKeywords: "business consulting,strategy consulting,business growth,operational efficiency",
      images: JSON.stringify(["/images/business-consulting-1.jpg"]),
      variants: JSON.stringify([
        { duration: "2 hours", location: "In-person", price: 250.00 },
        { duration: "2 hours", location: "Video call", price: 200.00 },
        { duration: "4 hours", location: "In-person", price: 450.00 }
      ]),
      customFields: JSON.stringify({
        duration: "2 hours",
        deliveryMethod: "In-person or video call",
        includes: "Strategy assessment, action plan, follow-up email",
        expertise: "Operations, Marketing, Finance, Technology"
      }),
      status: "ACTIVE"
    },
    {
      name: "Digital Marketing Course",
      sku: "DMC-001",
      description: "Comprehensive online digital marketing course with certificates and practical exercises",
      shortDescription: "Complete digital marketing online course",
      type: "DIGITAL",
      unitPrice: 149.99,
      costPrice: 0.00,
      stockQuantity: 999999,
      reservedQuantity: 0,
      availableQuantity: 999999,
      minStockLevel: 0,
      maxStockLevel: 999999,
      reorderPoint: 0,
      reorderQuantity: 0,
      brand: "LearnTech Academy",
      model: "LTA-DMC001",
      tags: "course,digital,marketing,online,education,certificate",
      weight: 0,
      barcode: "1234567890140",
      trackSerialNumbers: false,
      trackBatches: false,
      costingMethod: "FIFO",
      taxRate: 8.5,
      taxInclusive: false,
      isDigital: true,
      isService: false,
      isPhysical: false,
      trackInventory: false,
      allowBackorder: true,
      allowPreorder: false,
      isFeatured: true,
      isBestSeller: true,
      isNewArrival: true,
      warrantyPeriod: 0,
      warrantyUnit: "DAYS",
      returnPolicy: "30-day money-back guarantee",
      shippingClass: "digital",
      seoTitle: "Digital Marketing Mastery Course - Complete Online Training with Certificate",
      seoDescription: "Master digital marketing with our comprehensive course covering SEO, social media, PPC, and analytics",
      metaKeywords: "digital marketing course,online marketing training,seo course,social media marketing",
      images: JSON.stringify(["/images/course-1.jpg", "/images/course-certificate.jpg"]),
      customFields: JSON.stringify({
        duration: "8 weeks",
        videoHours: "24 hours",
        modules: "12 comprehensive modules",
        certificate: "Professional Certificate included",
        access: "Lifetime access"
      }),
      status: "ACTIVE"
    },
    {
      name: "Equipment Maintenance - Annual Plan",
      sku: "EM-001",
      description: "Annual equipment maintenance service plan for office machines and computer hardware",
      shortDescription: "Annual equipment maintenance service plan",
      type: "SERVICE",
      unitPrice: 599.99,
      costPrice: 0.00,
      stockQuantity: 0,
      reservedQuantity: 0,
      availableQuantity: 0,
      minStockLevel: 5,
      maxStockLevel: 25,
      reorderPoint: 8,
      reorderQuantity: 15,
      brand: "MaintainTech Services",
      model: "MTS-ANNUAL001",
      tags: "maintenance,service,equipment,annual,plan,contract",
      weight: 0,
      barcode: "1234567890141",
      trackSerialNumbers: true,
      trackBatches: false,
      costingMethod: "FIFO",
      taxRate: 8.5,
      taxInclusive: false,
      isDigital: false,
      isService: true,
      isPhysical: false,
      trackInventory: true,
      allowBackorder: true,
      allowPreorder: true,
      preorderDate: new Date('2025-12-01'),
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: true,
      warrantyPeriod: 12,
      warrantyUnit: "MONTHS",
      returnPolicy: "Service guarantee with performance metrics",
      shippingClass: "service",
      seoTitle: "Annual Equipment Maintenance Plan - Professional Service Contract",
      seoDescription: "Comprehensive equipment maintenance service to keep your office running smoothly year-round",
      metaKeywords: "equipment maintenance,service contract,annual maintenance,office equipment service",
      images: JSON.stringify(["/images/maintenance-1.jpg"]),
      customFields: JSON.stringify({
        coverage: "All office equipment and computers",
        visits: "Quarterly preventive maintenance",
        response: "24-hour emergency response",
        contract: "12-month renewable contract"
      }),
      status: "ACTIVE"
    }
  ];

  const createdProducts = [];
  for (const product of products) {
    const created = await prisma.product.create({
      data: {
        tenantId,
        companyId,
        ...product
      }
    });
    createdProducts.push(created);
  }

  return createdProducts;
}

async function createProductLocations(tenantId: string, companyId: string, products: any[], locations: any[]) {
  const mainWarehouse = locations.find(l => l.code === "WH001");
  const retailStore = locations.find(l => l.code === "ST001");
  const distributionCenter = locations.find(l => l.code === "DC001");
  const officeStorage = locations.find(l => l.code === "OS001");

  for (const product of products) {
    // Main warehouse gets most of the stock
    await prisma.productLocation.create({
      data: {
        tenantId,
        productId: product.id,
        locationId: mainWarehouse.id,
        quantity: Math.floor(product.stockQuantity * 0.6),
        reservedQuantity: Math.floor(product.stockQuantity * 0.1),
        reorderPoint: Math.floor(product.stockQuantity * 0.2),
        maxQuantity: Math.floor(product.stockQuantity * 1.5)
      }
    });

    // Retail store gets some stock
    await prisma.productLocation.create({
      data: {
        tenantId,
        productId: product.id,
        locationId: retailStore.id,
        quantity: Math.floor(product.stockQuantity * 0.25),
        reservedQuantity: Math.floor(product.stockQuantity * 0.05),
        reorderPoint: Math.floor(product.stockQuantity * 0.1),
        maxQuantity: Math.floor(product.stockQuantity * 0.4)
      }
    });

    // Distribution center gets some stock
    await prisma.productLocation.create({
      data: {
        tenantId,
        productId: product.id,
        locationId: distributionCenter.id,
        quantity: Math.floor(product.stockQuantity * 0.1),
        reservedQuantity: 0,
        reorderPoint: Math.floor(product.stockQuantity * 0.05),
        maxQuantity: Math.floor(product.stockQuantity * 0.2)
      }
    });

    // Office storage for office supplies and appliances
    if (product.tags && (product.tags.includes("office-supplies") || product.tags.includes("office") || product.tags.includes("appliance"))) {
      await prisma.productLocation.create({
        data: {
          tenantId,
          productId: product.id,
          locationId: officeStorage.id,
          quantity: Math.floor(product.stockQuantity * 0.05),
          reservedQuantity: 0,
          reorderPoint: Math.floor(product.stockQuantity * 0.02),
          maxQuantity: Math.floor(product.stockQuantity * 0.1)
        }
      });
    }
  }
}

async function createInventoryMovements(tenantId: string, companyId: string, products: any[], locations: any[]) {
  const mainWarehouse = locations.find(l => l.code === "WH001");
  const retailStore = locations.find(l => l.code === "ST001");

  const movements = [
    // Recent stock receipts
    {
      productId: products[0].id, // Wireless Headphones
      locationId: mainWarehouse.id,
      movementType: "RECEIPT",
      quantity: 50,
      unitCost: 120.00,
      movementDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      reference: "PO-2024-001",
      reason: "New stock received from supplier"
    },
    {
      productId: products[1].id, // Office Chair
      locationId: mainWarehouse.id,
      movementType: "RECEIPT",
      quantity: 20,
      unitCost: 180.00,
      movementDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      reference: "PO-2024-002",
      reason: "Bulk order received"
    },
    {
      productId: products[2].id, // USB-C Hub
      locationId: mainWarehouse.id,
      movementType: "RECEIPT",
      quantity: 100,
      unitCost: 45.00,
      movementDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      reference: "PO-2024-003",
      reason: "Regular restock"
    },
    // Sales/transfers
    {
      productId: products[0].id, // Wireless Headphones
      locationId: retailStore.id,
      movementType: "SALE",
      quantity: -15,
      unitCost: 199.99,
      movementDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      reference: "SALE-2024-001",
      reason: "Customer sales"
    },
    {
      productId: products[1].id, // Office Chair
      locationId: retailStore.id,
      movementType: "SALE",
      quantity: -8,
      unitCost: 299.99,
      movementDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      reference: "SALE-2024-002",
      reason: "Customer sales"
    },
    // Adjustments
    {
      productId: products[9].id, // Webcam HD
      locationId: mainWarehouse.id,
      movementType: "ADJUSTMENT",
      quantity: -5,
      unitCost: 35.00,
      movementDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      reference: "ADJ-2024-001",
      reason: "Damaged items removed"
    },
    {
      productId: products[4].id, // Mechanical Keyboard
      locationId: mainWarehouse.id,
      movementType: "ADJUSTMENT",
      quantity: 10,
      unitCost: 80.00,
      movementDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      reference: "ADJ-2024-002",
      reason: "Found additional stock"
    },
    // Transfers between locations
    {
      productId: products[3].id, // Standing Desk Converter
      locationId: retailStore.id,
      movementType: "TRANSFER_IN",
      quantity: 5,
      unitCost: 150.00,
      movementDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      reference: "TRF-2024-001",
      reason: "Transfer from warehouse"
    },
    {
      productId: products[3].id, // Standing Desk Converter
      locationId: mainWarehouse.id,
      movementType: "TRANSFER_OUT",
      quantity: -5,
      unitCost: 150.00,
      movementDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      reference: "TRF-2024-001",
      reason: "Transfer to retail store"
    }
  ];

  for (const movement of movements) {
    await prisma.inventoryMovement.create({
      data: {
        tenantId,
        ...movement
      }
    });
  }
}

async function createReorderAlerts(tenantId: string, companyId: string, products: any[], locations: any[]) {
  const mainWarehouse = locations.find(l => l.code === "WH001");
  const retailStore = locations.find(l => l.code === "ST001");

  const alerts = [
    {
      productId: products[9].id, // Webcam HD - Out of stock
      locationId: mainWarehouse.id,
      alertType: "OUT_OF_STOCK",
      threshold: 10,
      currentStock: 0,
      status: "PENDING",
      priority: "HIGH",
      message: "Product is completely out of stock"
    },
    {
      productId: products[14].id, // Coffee Machine - Low stock
      locationId: mainWarehouse.id,
      alertType: "LOW_STOCK",
      threshold: 10,
      currentStock: 5,
      status: "PENDING",
      priority: "MEDIUM",
      message: "Stock level below reorder point"
    },
    {
      productId: products[1].id, // Office Chair - Low stock at retail
      locationId: retailStore.id,
      alertType: "LOW_STOCK",
      threshold: 15,
      currentStock: 12,
      status: "ACKNOWLEDGED",
      priority: "MEDIUM",
      message: "Retail store stock running low"
    },
    {
      productId: products[3].id, // Standing Desk Converter - Low stock
      locationId: mainWarehouse.id,
      alertType: "LOW_STOCK",
      threshold: 20,
      currentStock: 18,
      status: "PENDING",
      priority: "LOW",
      message: "Approaching reorder point"
    },
    {
      productId: products[12].id, // Printer Paper - Overstock
      locationId: mainWarehouse.id,
      alertType: "OVERSTOCK",
      threshold: 800,
      currentStock: 1000,
      status: "PENDING",
      priority: "LOW",
      message: "Stock level above maximum recommended"
    }
  ];

  for (const alert of alerts) {
    await prisma.reorderAlert.create({
      data: {
        tenantId,
        ...alert
      }
    });
  }
}
