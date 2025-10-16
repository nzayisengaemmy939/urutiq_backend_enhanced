import { prisma } from '../prisma.js'
import { randomUUID } from 'crypto'

export type DepMethod = 'straight_line' | 'declining_balance' | 'sum_of_years_digits'

export interface AssetCategory {
  id: string
  tenantId: string
  companyId: string
  name: string
  usefulLifeMonths: number
  method: DepMethod
  salvageRate: number
  accounts: { assetId: string, depExpId: string, accDepId: string, disposalGainId?: string, disposalLossId?: string }
}

export interface FixedAsset {
  id: string
  tenantId: string
  companyId: string
  name: string
  categoryId: string
  cost: number
  currency: string
  acquisitionDate: string
  startDepreciation: string
  salvageValue?: number
  notes?: string
  disposedAt?: string
  disposalProceeds?: number
}

export class FixedAssetsService {
  // Minimal persistence scaffolding using Prisma where available; fallback to memory
  private memory: { categories: AssetCategory[]; assets: FixedAsset[]; depreciations: any[] } = { 
    categories: this.getSeedCategories(), 
    assets: this.getSeedAssets(),
    depreciations: this.getSeedDepreciations()
  }

  private getSeedCategories(): AssetCategory[] {
    return [
      {
        id: "cat-computer-equipment",
        tenantId: "tenant_demo",
        companyId: "seed-company-1",
        name: "Computer Equipment",
        usefulLifeMonths: 36,
        method: "straight_line",
        salvageRate: 0.10,
        accounts: {
          assetId: "1501",
          depExpId: "6101", 
          accDepId: "1511",
          disposalGainId: "4900",
          disposalLossId: "4901"
        }
      },
      {
        id: "cat-office-furniture",
        tenantId: "tenant_demo", 
        companyId: "seed-company-1",
        name: "Office Furniture",
        usefulLifeMonths: 84,
        method: "straight_line",
        salvageRate: 0.15,
        accounts: {
          assetId: "1502",
          depExpId: "6102",
          accDepId: "1512", 
          disposalGainId: "4900",
          disposalLossId: "4901"
        }
      },
      {
        id: "cat-vehicles",
        tenantId: "tenant_demo",
        companyId: "seed-company-1", 
        name: "Vehicles",
        usefulLifeMonths: 60,
        method: "declining_balance",
        salvageRate: 0.20,
        accounts: {
          assetId: "1503",
          depExpId: "6103",
          accDepId: "1513",
          disposalGainId: "4900", 
          disposalLossId: "4901"
        }
      },
      {
        id: "cat-machinery",
        tenantId: "tenant_demo",
        companyId: "seed-company-1",
        name: "Machinery", 
        usefulLifeMonths: 120,
        method: "sum_of_years_digits",
        salvageRate: 0.10,
        accounts: {
          assetId: "1504",
          depExpId: "6104",
          accDepId: "1514",
          disposalGainId: "4900",
          disposalLossId: "4901"
        }
      },
      {
        id: "cat-buildings",
        tenantId: "tenant_demo",
        companyId: "seed-company-1",
        name: "Buildings",
        usefulLifeMonths: 300,
        method: "straight_line", 
        salvageRate: 0.05,
        accounts: {
          assetId: "1505",
          depExpId: "6105",
          accDepId: "1515",
          disposalGainId: "4900",
          disposalLossId: "4901"
        }
      },
      {
        id: "cat-leasehold-improvements",
        tenantId: "tenant_demo",
        companyId: "seed-company-1",
        name: "Leasehold Improvements",
        usefulLifeMonths: 84,
        method: "straight_line",
        salvageRate: 0.0,
        accounts: {
          assetId: "1507",
          depExpId: "6106", 
          accDepId: "1516",
          disposalGainId: "4900",
          disposalLossId: "4901"
        }
      }
    ]
  }

  private getSeedAssets(): FixedAsset[] {
    return [
      {
        id: "asset-laptop-1",
        tenantId: "tenant_demo",
        companyId: "seed-company-1",
        name: "Dell Latitude 5520 Laptop",
        categoryId: "cat-computer-equipment",
        cost: 1299.00,
        currency: "USD",
        acquisitionDate: "2024-01-15",
        startDepreciation: "2024-02-01",
        salvageValue: 129.90,
        notes: "Primary laptop for CEO"
      },
      {
        id: "asset-laptop-2",
        tenantId: "tenant_demo", 
        companyId: "seed-company-1",
        name: "MacBook Pro 14-inch",
        categoryId: "cat-computer-equipment",
        cost: 2499.00,
        currency: "USD",
        acquisitionDate: "2024-02-10",
        startDepreciation: "2024-03-01",
        salvageValue: 249.90,
        notes: "Development team laptop"
      },
      {
        id: "asset-desktop-1",
        tenantId: "tenant_demo",
        companyId: "seed-company-1",
        name: "Dell OptiPlex Desktop",
        categoryId: "cat-computer-equipment", 
        cost: 899.00,
        currency: "USD",
        acquisitionDate: "2024-01-20",
        startDepreciation: "2024-02-01",
        salvageValue: 89.90,
        notes: "Reception desk computer"
      },
      {
        id: "asset-monitor-1",
        tenantId: "tenant_demo",
        companyId: "seed-company-1",
        name: "Dell UltraSharp 27-inch Monitor",
        categoryId: "cat-computer-equipment",
        cost: 399.00,
        currency: "USD", 
        acquisitionDate: "2024-01-25",
        startDepreciation: "2024-02-01",
        salvageValue: 39.90,
        notes: "External monitor for laptop setup"
      },
      {
        id: "asset-desk-1",
        tenantId: "tenant_demo",
        companyId: "seed-company-1",
        name: "Standing Desk - Electric Adjustable",
        categoryId: "cat-office-furniture",
        cost: 899.00,
        currency: "USD",
        acquisitionDate: "2024-01-10", 
        startDepreciation: "2024-02-01",
        salvageValue: 134.85,
        notes: "CEO's standing desk"
      },
      {
        id: "asset-chair-1",
        tenantId: "tenant_demo",
        companyId: "seed-company-1",
        name: "Herman Miller Aeron Chair",
        categoryId: "cat-office-furniture",
        cost: 1295.00,
        currency: "USD",
        acquisitionDate: "2024-01-10",
        startDepreciation: "2024-02-01", 
        salvageValue: 194.25,
        notes: "Ergonomic office chair"
      },
      {
        id: "asset-vehicle-1",
        tenantId: "tenant_demo",
        companyId: "seed-company-1",
        name: "Toyota Camry 2024",
        categoryId: "cat-vehicles",
        cost: 28500.00,
        currency: "USD",
        acquisitionDate: "2024-02-01",
        startDepreciation: "2024-03-01",
        salvageValue: 5700.00,
        notes: "Company car for sales team"
      },
      {
        id: "asset-vehicle-2",
        tenantId: "tenant_demo",
        companyId: "seed-company-1", 
        name: "Ford Transit Van",
        categoryId: "cat-vehicles",
        cost: 35000.00,
        currency: "USD",
        acquisitionDate: "2024-01-15",
        startDepreciation: "2024-02-01",
        salvageValue: 7000.00,
        notes: "Delivery van for inventory transport"
      },
      {
        id: "asset-printer-1",
        tenantId: "tenant_demo",
        companyId: "seed-company-1",
        name: "HP LaserJet Enterprise Printer",
        categoryId: "cat-machinery",
        cost: 2499.00,
        currency: "USD",
        acquisitionDate: "2024-01-05",
        startDepreciation: "2024-02-01",
        salvageValue: 249.90,
        notes: "High-volume office printer"
      },
      {
        id: "asset-office-building",
        tenantId: "tenant_demo",
        companyId: "seed-company-1",
        name: "Office Building - 123 Business Ave",
        categoryId: "cat-buildings",
        cost: 750000.00,
        currency: "USD",
        acquisitionDate: "2023-06-01",
        startDepreciation: "2023-07-01", 
        salvageValue: 37500.00,
        notes: "Main office building"
      },
      {
        id: "asset-office-renovation",
        tenantId: "tenant_demo",
        companyId: "seed-company-1",
        name: "Office Renovation & Fit-out",
        categoryId: "cat-leasehold-improvements",
        cost: 45000.00,
        currency: "USD",
        acquisitionDate: "2023-07-01",
        startDepreciation: "2023-08-01",
        salvageValue: 0,
        notes: "Complete office renovation including flooring, lighting, and fixtures"
      }
    ]
  }

  private getSeedDepreciations(): any[] {
    return [
      // Dell Latitude Laptop depreciation (straight-line, 36 months)
      {
        id: "dep-laptop-1-2024-02",
        assetId: "asset-laptop-1",
        period: "2024-02",
        amount: 32.47, // (1299 - 129.90) / 36
        accumulated: 32.47,
        postedAt: new Date("2024-02-29"),
        journalEntryId: "je-laptop-dep-2024-02"
      },
      {
        id: "dep-laptop-1-2024-03",
        assetId: "asset-laptop-1",
        period: "2024-03",
        amount: 32.47,
        accumulated: 64.94,
        postedAt: new Date("2024-03-31"),
        journalEntryId: "je-laptop-dep-2024-03"
      },
      {
        id: "dep-laptop-1-2024-04",
        assetId: "asset-laptop-1",
        period: "2024-04",
        amount: 32.47,
        accumulated: 97.41,
        postedAt: new Date("2024-04-30"),
        journalEntryId: "je-laptop-dep-2024-04"
      },

      // MacBook Pro depreciation (straight-line, 36 months)
      {
        id: "dep-laptop-2-2024-03",
        assetId: "asset-laptop-2",
        period: "2024-03",
        amount: 62.48, // (2499 - 249.90) / 36
        accumulated: 62.48,
        postedAt: new Date("2024-03-31"),
        journalEntryId: "je-macbook-dep-2024-03"
      },
      {
        id: "dep-laptop-2-2024-04",
        assetId: "asset-laptop-2",
        period: "2024-04",
        amount: 62.48,
        accumulated: 124.96,
        postedAt: new Date("2024-04-30"),
        journalEntryId: "je-macbook-dep-2024-04"
      },

      // Standing Desk depreciation (straight-line, 84 months)
      {
        id: "dep-desk-1-2024-02",
        assetId: "asset-desk-1",
        period: "2024-02",
        amount: 9.09, // (899 - 134.85) / 84
        accumulated: 9.09,
        postedAt: new Date("2024-02-29"),
        journalEntryId: "je-desk-dep-2024-02"
      },
      {
        id: "dep-desk-1-2024-03",
        assetId: "asset-desk-1",
        period: "2024-03",
        amount: 9.09,
        accumulated: 18.18,
        postedAt: new Date("2024-03-31"),
        journalEntryId: "je-desk-dep-2024-03"
      },
      {
        id: "dep-desk-1-2024-04",
        assetId: "asset-desk-1",
        period: "2024-04",
        amount: 9.09,
        accumulated: 27.27,
        postedAt: new Date("2024-04-30"),
        journalEntryId: "je-desk-dep-2024-04"
      },

      // Toyota Camry depreciation (declining balance, 60 months)
      {
        id: "dep-vehicle-1-2024-03",
        assetId: "asset-vehicle-1",
        period: "2024-03",
        amount: 950.00, // (28500 - 5700) * (2/60)
        accumulated: 950.00,
        postedAt: new Date("2024-03-31"),
        journalEntryId: "je-camry-dep-2024-03"
      },
      {
        id: "dep-vehicle-1-2024-04",
        assetId: "asset-vehicle-1",
        period: "2024-04",
        amount: 918.33, // (22800 - 950) * (2/60)
        accumulated: 1868.33,
        postedAt: new Date("2024-04-30"),
        journalEntryId: "je-camry-dep-2024-04"
      },

      // Office Building depreciation (straight-line, 300 months)
      {
        id: "dep-building-1-2023-07",
        assetId: "asset-office-building",
        period: "2023-07",
        amount: 2375.00, // (750000 - 37500) / 300
        accumulated: 2375.00,
        postedAt: new Date("2023-07-31"),
        journalEntryId: "je-building-dep-2023-07"
      },
      {
        id: "dep-building-1-2023-08",
        assetId: "asset-office-building",
        period: "2023-08",
        amount: 2375.00,
        accumulated: 4750.00,
        postedAt: new Date("2023-08-31"),
        journalEntryId: "je-building-dep-2023-08"
      },
      {
        id: "dep-building-1-2023-09",
        assetId: "asset-office-building",
        period: "2023-09",
        amount: 2375.00,
        accumulated: 7125.00,
        postedAt: new Date("2023-09-30"),
        journalEntryId: "je-building-dep-2023-09"
      },
      {
        id: "dep-building-1-2023-10",
        assetId: "asset-office-building",
        period: "2023-10",
        amount: 2375.00,
        accumulated: 9500.00,
        postedAt: new Date("2023-10-31"),
        journalEntryId: "je-building-dep-2023-10"
      },
      {
        id: "dep-building-1-2023-11",
        assetId: "asset-office-building",
        period: "2023-11",
        amount: 2375.00,
        accumulated: 11875.00,
        postedAt: new Date("2023-11-30"),
        journalEntryId: "je-building-dep-2023-11"
      },
      {
        id: "dep-building-1-2023-12",
        assetId: "asset-office-building",
        period: "2023-12",
        amount: 2375.00,
        accumulated: 14250.00,
        postedAt: new Date("2023-12-31"),
        journalEntryId: "je-building-dep-2023-12"
      },
      {
        id: "dep-building-1-2024-01",
        assetId: "asset-office-building",
        period: "2024-01",
        amount: 2375.00,
        accumulated: 16625.00,
        postedAt: new Date("2024-01-31"),
        journalEntryId: "je-building-dep-2024-01"
      },
      {
        id: "dep-building-1-2024-02",
        assetId: "asset-office-building",
        period: "2024-02",
        amount: 2375.00,
        accumulated: 19000.00,
        postedAt: new Date("2024-02-29"),
        journalEntryId: "je-building-dep-2024-02"
      },
      {
        id: "dep-building-1-2024-03",
        assetId: "asset-office-building",
        period: "2024-03",
        amount: 2375.00,
        accumulated: 21375.00,
        postedAt: new Date("2024-03-31"),
        journalEntryId: "je-building-dep-2024-03"
      },
      {
        id: "dep-building-1-2024-04",
        assetId: "asset-office-building",
        period: "2024-04",
        amount: 2375.00,
        accumulated: 23750.00,
        postedAt: new Date("2024-04-30"),
        journalEntryId: "je-building-dep-2024-04"
      },

      // Office Renovation depreciation (straight-line, 84 months)
      {
        id: "dep-renovation-1-2023-08",
        assetId: "asset-office-renovation",
        period: "2023-08",
        amount: 535.71, // 45000 / 84
        accumulated: 535.71,
        postedAt: new Date("2023-08-31"),
        journalEntryId: "je-renovation-dep-2023-08"
      },
      {
        id: "dep-renovation-1-2023-09",
        assetId: "asset-office-renovation",
        period: "2023-09",
        amount: 535.71,
        accumulated: 1071.42,
        postedAt: new Date("2023-09-30"),
        journalEntryId: "je-renovation-dep-2023-09"
      },
      {
        id: "dep-renovation-1-2023-10",
        assetId: "asset-office-renovation",
        period: "2023-10",
        amount: 535.71,
        accumulated: 1607.13,
        postedAt: new Date("2023-10-31"),
        journalEntryId: "je-renovation-dep-2023-10"
      },
      {
        id: "dep-renovation-1-2023-11",
        assetId: "asset-office-renovation",
        period: "2023-11",
        amount: 535.71,
        accumulated: 2142.84,
        postedAt: new Date("2023-11-30"),
        journalEntryId: "je-renovation-dep-2023-11"
      },
      {
        id: "dep-renovation-1-2023-12",
        assetId: "asset-office-renovation",
        period: "2023-12",
        amount: 535.71,
        accumulated: 2678.55,
        postedAt: new Date("2023-12-31"),
        journalEntryId: "je-renovation-dep-2023-12"
      },
      {
        id: "dep-renovation-1-2024-01",
        assetId: "asset-office-renovation",
        period: "2024-01",
        amount: 535.71,
        accumulated: 3214.26,
        postedAt: new Date("2024-01-31"),
        journalEntryId: "je-renovation-dep-2024-01"
      },
      {
        id: "dep-renovation-1-2024-02",
        assetId: "asset-office-renovation",
        period: "2024-02",
        amount: 535.71,
        accumulated: 3749.97,
        postedAt: new Date("2024-02-29"),
        journalEntryId: "je-renovation-dep-2024-02"
      },
      {
        id: "dep-renovation-1-2024-03",
        assetId: "asset-office-renovation",
        period: "2024-03",
        amount: 535.71,
        accumulated: 4285.68,
        postedAt: new Date("2024-03-31"),
        journalEntryId: "je-renovation-dep-2024-03"
      },
      {
        id: "dep-renovation-1-2024-04",
        assetId: "asset-office-renovation",
        period: "2024-04",
        amount: 535.71,
        accumulated: 4821.39,
        postedAt: new Date("2024-04-30"),
        journalEntryId: "je-renovation-dep-2024-04"
      }
    ]
  }

  async listCategories(companyId: string) {
    try { return await prisma.fixedAssetCategory.findMany({ where: { companyId } }) as any } catch { return this.memory.categories.filter(c => c.companyId === companyId) }
  }

  async upsertCategory(cat: AssetCategory) {
    try {
      const exists = await prisma.fixedAssetCategory.findFirst({ where: { id: cat.id } })
      if (exists) return await prisma.fixedAssetCategory.update({ where: { id: cat.id }, data: cat as any }) as any
      return await prisma.fixedAssetCategory.create({ data: cat as any }) as any
    } catch {
      const idx = this.memory.categories.findIndex(x => x.id === cat.id)
      if (idx >= 0) this.memory.categories[idx] = cat; else this.memory.categories.push(cat)
      return cat
    }
  }

  async listAssets(companyId: string) {
    try { return await prisma.fixedAsset.findMany({ where: { companyId } }) as any } catch { return this.memory.assets.filter(a => a.companyId === companyId) }
  }

  async upsertAsset(asset: FixedAsset) {
    try {
      const exists = await prisma.fixedAsset.findFirst({ where: { id: asset.id } })
      if (exists) return await prisma.fixedAsset.update({ where: { id: asset.id }, data: asset as any }) as any
      return await prisma.fixedAsset.create({ data: asset as any }) as any
    } catch {
      const idx = this.memory.assets.findIndex(x => x.id === asset.id)
      if (idx >= 0) this.memory.assets[idx] = asset; else this.memory.assets.push(asset)
      return asset
    }
  }

  async deleteAsset(id: string) {
    try { await prisma.fixedAsset.delete({ where: { id } }) } catch { this.memory.assets = this.memory.assets.filter(a => a.id !== id) }
    return { id }
  }

  // Depreciation preview
  previewDepreciation(asset: FixedAsset, category: AssetCategory, asOf: string) {
    // First, check if we have existing depreciation records
    const existingDepreciations = this.memory.depreciations.filter(d => d.assetId === asset.id)
    
    if (existingDepreciations.length > 0) {
      // Use existing depreciation data
      const schedule = existingDepreciations.map(dep => ({
        period: dep.period,
        amount: dep.amount,
        accumulated: dep.accumulated
      }))
      const latestDep = existingDepreciations[existingDepreciations.length - 1]
      return { schedule, accumulated: latestDep.accumulated }
    }

    // Fallback to calculated depreciation
    const start = new Date(asset.startDepreciation)
    const end = new Date(asOf)
    const months = Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1)
    const useful = Math.max(1, category.usefulLifeMonths)
    const cost = Number(asset.cost)
    const salvage = asset.salvageValue ?? (cost * (category.salvageRate || 0))
    const base = Math.max(0, cost - salvage)
    let accumulated = 0
    let schedule: Array<{ period: string, amount: number, accumulated: number }> = []
    for (let m = 0; m < Math.min(months, useful); m++) {
      const periodDate = new Date(start.getFullYear(), start.getMonth() + m, 1)
      let dep = 0
      if (category.method === 'straight_line') dep = +(base / useful).toFixed(2)
      else if (category.method === 'declining_balance') dep = +((base - accumulated) * (2 / useful)).toFixed(2)
      else {
        const n = useful
        const sum = (n * (n + 1)) / 2
        const yearIdx = Math.floor(m / 12)
        const remaining = Math.max(1, n - yearIdx * 12)
        dep = +((base * (remaining / sum)) / 12).toFixed(2)
      }
      accumulated = +(Math.min(base, accumulated + dep)).toFixed(2)
      schedule.push({ period: `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}`, amount: dep, accumulated })
    }
    return { schedule, accumulated }
  }

  async previewCompanyDepreciation(companyId: string, asOf: string) {
    const [assets, cats] = await Promise.all([this.listAssets(companyId), this.listCategories(companyId)])
    const catById = new Map(cats.map((c: any) => [c.id, c]))
    const items = assets.map((a: any) => ({ asset: a, category: catById.get(a.categoryId), preview: this.previewDepreciation(a, catById.get(a.categoryId), asOf) }))
    return { asOf, items }
  }

  async postCompanyDepreciationJournal(tenantId: string, companyId: string, asOf: string) {
    const preview = await this.previewCompanyDepreciation(companyId, asOf)
    const items = preview.items.filter((i: any) => i.category && i.preview?.schedule?.length)
    if (items.length === 0) return { created: null }
    const memo = `Monthly Depreciation as of ${asOf}`
    const date = new Date(asOf)
    const created = await prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({ data: { tenantId, companyId, date, memo, reference: `DEP-${asOf}` } })
      for (const it of items) {
        const last = it.preview.schedule[it.preview.schedule.length - 1]
        const amount = Number(last?.amount || 0)
        if (amount <= 0) continue
        await tx.journalLine.create({ data: { tenantId, entryId: entry.id, accountId: it.category.accounts.depExpId, debit: amount, credit: 0, memo: it.asset.name } })
        await tx.journalLine.create({ data: { tenantId, entryId: entry.id, accountId: it.category.accounts.accDepId, debit: 0, credit: amount, memo: it.asset.name } })
      }
      return entry
    })
    return { created }
  }

  async disposeAssetJournal(tenantId: string, companyId: string, assetId: string, disposeDate: string, proceeds: number, proceedsAccountId?: string) {
    const [assets, cats] = await Promise.all([this.listAssets(companyId), this.listCategories(companyId)])
    const asset = (assets as any[]).find(a => a.id === assetId)
    if (!asset) return { created: null, error: 'asset_not_found' }
    const category = (cats as any[]).find(c => c.id === asset.categoryId)
    if (!category) return { created: null, error: 'category_not_found' }
    const prev = this.previewDepreciation(asset as any, category as any, disposeDate)
    const accumulated = Number(prev.accumulated || 0)
    const cost = Number(asset.cost || 0)
    const carrying = +(cost - accumulated).toFixed(2)
    const gainLoss = +(Number(proceeds || 0) - carrying).toFixed(2)
    const date = new Date(disposeDate)
    const memo = `Dispose asset ${asset.name}`
    const created = await prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({ data: { tenantId, companyId, date, memo, reference: `DISP-${assetId}` } })
      // Remove asset
      if (accumulated > 0) await tx.journalLine.create({ data: { tenantId, entryId: entry.id, accountId: category.accounts.accDepId, debit: accumulated, credit: 0, memo: 'Reverse accumulated depreciation' } })
      if (cost > 0) await tx.journalLine.create({ data: { tenantId, entryId: entry.id, accountId: category.accounts.assetId, debit: 0, credit: cost, memo: 'Remove asset cost' } })
      // Proceeds
      const proceedsAmt = Number(proceeds || 0)
      if (proceedsAmt !== 0 && proceedsAccountId) {
        // Assume proceeds received (debit cash/bank)
        await tx.journalLine.create({ data: { tenantId, entryId: entry.id, accountId: proceedsAccountId, debit: proceedsAmt, credit: 0, memo: 'Proceeds' } })
      }
      // Gain or loss
      if (gainLoss > 0 && category.accounts.disposalGainId) {
        await tx.journalLine.create({ data: { tenantId, entryId: entry.id, accountId: category.accounts.disposalGainId, debit: 0, credit: gainLoss, memo: 'Gain on disposal' } })
      } else if (gainLoss < 0 && category.accounts.disposalLossId) {
        await tx.journalLine.create({ data: { tenantId, entryId: entry.id, accountId: category.accounts.disposalLossId, debit: Math.abs(gainLoss), credit: 0, memo: 'Loss on disposal' } })
      }
      return entry
    })
    return { created, carrying, accumulated }
  }
}

export const fixedAssetsService = new FixedAssetsService()


