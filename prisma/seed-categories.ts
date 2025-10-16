import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedCategories(tenantId: string, companyId: string) {
  console.log(`🗂️  Seeding categories for tenant ${tenantId}, company ${companyId}...`);

  // Check if categories already exist
  const existingCategories = await prisma.category.count({
    where: { tenantId, companyId }
  });

  if (existingCategories > 0) {
    console.log(`   ✅ Categories already exist (${existingCategories} found), skipping...`);
    return;
  }

  // Main category definitions with hierarchy
  const categoriesData = [
    // Electronics & Technology
    {
      id: "cat-electronics",
      name: "Electronics & Technology",
      description: "Electronic devices, components, and technology products",
      color: "#2563eb",
      icon: "Zap",
      parentId: null,
      children: [
        {
          id: "cat-computers",
          name: "Computers & Laptops",
          description: "Desktop computers, laptops, and accessories",
          color: "#1d4ed8",
          icon: "Monitor"
        },
        {
          id: "cat-mobile",
          name: "Mobile Devices",
          description: "Smartphones, tablets, and mobile accessories",
          color: "#1e40af",
          icon: "Smartphone"
        },
        {
          id: "cat-audio",
          name: "Audio & Video",
          description: "Headphones, speakers, cameras, and AV equipment",
          color: "#1e3a8a",
          icon: "Headphones"
        },
        {
          id: "cat-components",
          name: "Electronic Components",
          description: "Circuits, sensors, cables, and electronic parts",
          color: "#172554",
          icon: "Cpu"
        }
      ]
    },

    // Office & Business
    {
      id: "cat-office",
      name: "Office & Business",
      description: "Office supplies, furniture, and business equipment",
      color: "#059669",
      icon: "Building",
      parentId: null,
      children: [
        {
          id: "cat-furniture",
          name: "Office Furniture",
          description: "Desks, chairs, cabinets, and office furniture",
          color: "#047857",
          icon: "Home"
        },
        {
          id: "cat-supplies",
          name: "Office Supplies",
          description: "Stationery, paper, pens, and consumables",
          color: "#065f46",
          icon: "PenTool"
        },
        {
          id: "cat-equipment",
          name: "Business Equipment",
          description: "Printers, scanners, shredders, and office machines",
          color: "#064e3b",
          icon: "Printer"
        }
      ]
    },

    // Industrial & Manufacturing
    {
      id: "cat-industrial",
      name: "Industrial & Manufacturing",
      description: "Industrial equipment, tools, and manufacturing supplies",
      color: "#dc2626",
      icon: "Wrench",
      parentId: null,
      children: [
        {
          id: "cat-machinery",
          name: "Machinery & Equipment",
          description: "Industrial machines, production equipment",
          color: "#b91c1c",
          icon: "Settings"
        },
        {
          id: "cat-tools",
          name: "Tools & Hardware",
          description: "Hand tools, power tools, and hardware supplies",
          color: "#991b1b",
          icon: "Hammer"
        },
        {
          id: "cat-safety",
          name: "Safety Equipment",
          description: "PPE, safety gear, and protective equipment",
          color: "#7f1d1d",
          icon: "Shield"
        },
        {
          id: "cat-materials",
          name: "Raw Materials",
          description: "Steel, plastic, chemicals, and raw materials",
          color: "#6b1818",
          icon: "Package"
        }
      ]
    },

    // Healthcare & Medical
    {
      id: "cat-healthcare",
      name: "Healthcare & Medical",
      description: "Medical equipment, supplies, and healthcare products",
      color: "#7c3aed",
      icon: "Heart",
      parentId: null,
      children: [
        {
          id: "cat-medical-devices",
          name: "Medical Devices",
          description: "Medical instruments and diagnostic equipment",
          color: "#6d28d9",
          icon: "Stethoscope"
        },
        {
          id: "cat-consumables",
          name: "Medical Consumables",
          description: "Syringes, bandages, and disposable supplies",
          color: "#5b21b6",
          icon: "Plus"
        },
        {
          id: "cat-pharmaceuticals",
          name: "Pharmaceuticals",
          description: "Medications, drugs, and pharmaceutical products",
          color: "#4c1d95",
          icon: "Pill"
        }
      ]
    },

    // Automotive & Transportation
    {
      id: "cat-automotive",
      name: "Automotive & Transportation",
      description: "Vehicle parts, automotive supplies, and transportation equipment",
      color: "#ea580c",
      icon: "Car",
      parentId: null,
      children: [
        {
          id: "cat-auto-parts",
          name: "Auto Parts",
          description: "Engine parts, brakes, filters, and car components",
          color: "#c2410c",
          icon: "Settings"
        },
        {
          id: "cat-fluids",
          name: "Fluids & Lubricants",
          description: "Motor oil, brake fluid, coolant, and lubricants",
          color: "#9a3412",
          icon: "Droplets"
        },
        {
          id: "cat-accessories",
          name: "Vehicle Accessories",
          description: "Tires, batteries, lights, and accessories",
          color: "#7c2d12",
          icon: "Zap"
        }
      ]
    },

    // Food & Beverage
    {
      id: "cat-food",
      name: "Food & Beverage",
      description: "Food products, beverages, and consumables",
      color: "#16a34a",
      icon: "Coffee",
      parentId: null,
      children: [
        {
          id: "cat-fresh",
          name: "Fresh Products",
          description: "Fresh fruits, vegetables, dairy, and perishables",
          color: "#15803d",
          icon: "Apple"
        },
        {
          id: "cat-packaged",
          name: "Packaged Foods",
          description: "Canned goods, snacks, and packaged foods",
          color: "#166534",
          icon: "Package"
        },
        {
          id: "cat-beverages",
          name: "Beverages",
          description: "Soft drinks, juices, water, and beverages",
          color: "#14532d",
          icon: "Coffee"
        }
      ]
    },

    // Textiles & Apparel
    {
      id: "cat-textiles",
      name: "Textiles & Apparel",
      description: "Clothing, fabrics, and textile products",
      color: "#db2777",
      icon: "Shirt",
      parentId: null,
      children: [
        {
          id: "cat-clothing",
          name: "Clothing",
          description: "Shirts, pants, dresses, and apparel",
          color: "#be185d",
          icon: "Shirt"
        },
        {
          id: "cat-fabrics",
          name: "Fabrics & Materials",
          description: "Cotton, polyester, silk, and textile materials",
          color: "#9d174d",
          icon: "Layers"
        },
        {
          id: "cat-accessories-fashion",
          name: "Fashion Accessories",
          description: "Bags, belts, jewelry, and fashion accessories",
          color: "#831843",
          icon: "Watch"
        }
      ]
    },

    // Services
    {
      id: "cat-services",
      name: "Services",
      description: "Service-based products and intangible items",
      color: "#0891b2",
      icon: "Users",
      parentId: null,
      children: [
        {
          id: "cat-consulting",
          name: "Consulting Services",
          description: "Business consulting and professional services",
          color: "#0e7490",
          icon: "Briefcase"
        },
        {
          id: "cat-maintenance",
          name: "Maintenance Services",
          description: "Equipment maintenance and repair services",
          color: "#155e75",
          icon: "Tool"
        },
        {
          id: "cat-training",
          name: "Training & Education",
          description: "Training programs and educational services",
          color: "#164e63",
          icon: "GraduationCap"
        }
      ]
    }
  ];

  // Create root categories first
  const createdCategories: Record<string, any> = {};
  
  for (const categoryData of categoriesData) {
    const rootCategory = await prisma.category.create({
      data: {
        id: categoryData.id,
        tenantId,
        companyId,
        name: categoryData.name,
        description: categoryData.description,
        color: categoryData.color,
        icon: categoryData.icon,
        parentId: null,
        isActive: true
      }
    });
    
    createdCategories[categoryData.id] = rootCategory;
    console.log(`   ✅ Created root category: ${rootCategory.name}`);

    // Create child categories
    if (categoryData.children) {
      for (const childData of categoryData.children) {
        const childCategory = await prisma.category.create({
          data: {
            id: childData.id,
            tenantId,
            companyId,
            name: childData.name,
            description: childData.description,
            color: childData.color,
            icon: childData.icon,
            parentId: rootCategory.id,
            isActive: true
          }
        });
        
        createdCategories[childData.id] = childCategory;
        console.log(`     ↳ Created child category: ${childCategory.name}`);
      }
    }
  }

  console.log(`   🎉 Successfully created ${Object.keys(createdCategories).length} categories!`);
  return createdCategories;
}

// Run this directly if called as main module
if (import.meta.url === `file://${process.argv[1]}`) {
  async function run() {
    try {
      const tenantId = process.env.TENANT_ID || "demo-tenant";
      const companyId = process.env.COMPANY_ID || "demo-company";
      
      await seedCategories(tenantId, companyId);
      console.log("✅ Category seeding completed!");
    } catch (error) {
      console.error("❌ Error seeding categories:", error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  }
  
  run();
}
