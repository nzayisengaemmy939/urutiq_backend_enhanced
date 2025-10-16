import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
const prisma = new PrismaClient();
// Helper function to generate IDs
function generateId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
// Tax calendar event types and schedules
export const TaxCalendarDefaults = {
    US: {
        federal: [
            {
                eventType: 'filing_due',
                title: 'Corporate Income Tax Return (Form 1120)',
                formCodes: ['1120'],
                dueDate: { month: 3, day: 15 }, // March 15
                frequency: 'annually',
                priority: 'high',
            },
            {
                eventType: 'filing_due',
                title: 'Quarterly Payroll Tax Return (Form 941)',
                formCodes: ['941'],
                dueDate: { month: 'quarterly', day: -1 }, // Last day of month following quarter
                frequency: 'quarterly',
                priority: 'high',
            },
            {
                eventType: 'payment_due',
                title: 'Estimated Tax Payment',
                dueDate: { month: 'quarterly', day: 15 }, // 15th of quarter months
                frequency: 'quarterly',
                priority: 'medium',
            },
            {
                eventType: 'filing_due',
                title: 'Annual Information Returns (W-2, 1099)',
                formCodes: ['W-2', '1099'],
                dueDate: { month: 1, day: 31 }, // January 31
                frequency: 'annually',
                priority: 'high',
            },
        ],
        state: [
            {
                eventType: 'filing_due',
                title: 'State Income Tax Return',
                dueDate: { month: 3, day: 15 },
                frequency: 'annually',
                priority: 'medium',
            },
            {
                eventType: 'payment_due',
                title: 'State Sales Tax Return',
                dueDate: { month: 'monthly', day: 20 }, // 20th of each month
                frequency: 'monthly',
                priority: 'medium',
            },
        ],
    },
    CA: {
        federal: [
            {
                eventType: 'filing_due',
                title: 'Corporation Income Tax Return (T2)',
                formCodes: ['T2'],
                dueDate: { month: 6, day: 30 }, // 6 months after year-end
                frequency: 'annually',
                priority: 'high',
            },
            {
                eventType: 'filing_due',
                title: 'GST/HST Return',
                formCodes: ['GST34'],
                dueDate: { month: 'monthly', day: -1 }, // Last day of month
                frequency: 'monthly',
                priority: 'high',
            },
        ],
    },
    UK: {
        federal: [
            {
                eventType: 'filing_due',
                title: 'Corporation Tax Return (CT600)',
                formCodes: ['CT600'],
                dueDate: { month: 12, day: -1 }, // 12 months after year-end
                frequency: 'annually',
                priority: 'high',
            },
            {
                eventType: 'filing_due',
                title: 'VAT Return',
                formCodes: ['VAT100'],
                dueDate: { month: 'quarterly', day: 7 }, // 7th of month following quarter
                frequency: 'quarterly',
                priority: 'high',
            },
        ],
    },
};
// Validation schemas
export const CreateTaxCalendarEventSchema = z.object({
    jurisdictionId: z.string(),
    eventType: z.enum(['filing_due', 'payment_due', 'estimated_payment', 'reminder']),
    title: z.string().min(1),
    description: z.string().optional(),
    dueDate: z.string().datetime(),
    formCodes: z.array(z.string()).default([]),
    amount: z.number().optional(),
    isRecurring: z.boolean().default(false),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annually']).optional(),
    reminderDays: z.array(z.number()).default([7, 3, 1]),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});
export const UpdateTaxCalendarEventSchema = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    dueDate: z.string().datetime().optional(),
    amount: z.number().optional(),
    isCompleted: z.boolean().optional(),
    reminderDays: z.array(z.number()).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});
// Tax Calendar Service
export class TaxCalendarService {
    static async initializeCalendar(tenantId, companyId, country, taxYear) {
        const company = await prisma.$queryRaw `
      SELECT * FROM Company WHERE id = ${companyId} AND tenantId = ${tenantId} LIMIT 1
    `;
        if (!company || company.length === 0) {
            throw new Error('Company not found');
        }
        // Get or create jurisdictions for the country
        const jurisdictions = await this.getOrCreateJurisdictions(tenantId, companyId, country);
        // Generate calendar events for the tax year
        const events = [];
        const defaults = TaxCalendarDefaults[country];
        if (!defaults) {
            throw new Error(`Tax calendar defaults not available for country: ${country}`);
        }
        for (const jurisdiction of jurisdictions) {
            const jurisdictionDefaults = defaults[jurisdiction.level];
            if (!jurisdictionDefaults)
                continue;
            for (const eventDef of jurisdictionDefaults) {
                const dueDates = this.calculateDueDates(eventDef, taxYear, company[0].fiscalYearStart || undefined);
                for (const dueDate of dueDates) {
                    const eventId = generateId();
                    await prisma.$executeRaw `
            INSERT INTO TaxCalendar (
              id, tenantId, companyId, jurisdictionId, eventType, title, description,
              dueDate, formCodes, isRecurring, frequency, priority, reminderDays,
              isCompleted, completedAt, amount, createdAt, updatedAt
            )
            VALUES (
              ${eventId}, ${tenantId}, ${companyId}, ${jurisdiction.id}, ${eventDef.eventType},
              ${eventDef.title}, ${eventDef.description || ''}, ${dueDate},
              ${JSON.stringify(eventDef.formCodes || [])}, ${eventDef.frequency !== 'annually'},
              ${eventDef.frequency}, ${eventDef.priority || 'medium'},
              ${JSON.stringify([30, 14, 7, 3, 1])}, false, null, null,
              ${new Date()}, ${new Date()}
            )
          `;
                    const event = await prisma.$queryRaw `
            SELECT * FROM TaxCalendar WHERE id = ${eventId}
          `;
                    events.push(event[0]);
                    // Create reminders
                    await this.createReminders(eventId, dueDate, [30, 14, 7, 3, 1]);
                }
            }
        }
        return events;
    }
    static async getOrCreateJurisdictions(tenantId, companyId, country) {
        // Check existing jurisdictions
        let jurisdictions = await prisma.$queryRaw `
      SELECT * FROM TaxJurisdiction 
      WHERE tenantId = ${tenantId} AND companyId = ${companyId} AND country = ${country}
    `;
        if (jurisdictions.length === 0) {
            // Create default jurisdictions for the country
            const defaultJurisdictions = this.getDefaultJurisdictions(country);
            jurisdictions = [];
            for (const jur of defaultJurisdictions) {
                const jurisdictionId = generateId();
                await prisma.$executeRaw `
          INSERT INTO TaxJurisdiction (
            id, tenantId, companyId, name, code, country, region, locality, level,
            isActive, createdAt, updatedAt
          )
          VALUES (
            ${jurisdictionId}, ${tenantId}, ${companyId}, ${jur.name}, ${jur.code},
            ${jur.country}, ${jur.region || null}, ${jur.locality || null}, ${jur.level},
            true, ${new Date()}, ${new Date()}
          )
        `;
                const created = await prisma.$queryRaw `
          SELECT * FROM TaxJurisdiction WHERE id = ${jurisdictionId}
        `;
                jurisdictions.push(created[0]);
            }
        }
        return jurisdictions;
    }
    static getDefaultJurisdictions(country) {
        const jurisdictions = {
            US: [
                { name: 'Federal', code: 'US-FED', country: 'US', level: 'federal' },
                { name: 'State', code: 'US-STATE', country: 'US', region: 'DEFAULT', level: 'state' },
            ],
            CA: [
                { name: 'Federal', code: 'CA-FED', country: 'CA', level: 'federal' },
                { name: 'Provincial', code: 'CA-PROV', country: 'CA', region: 'DEFAULT', level: 'state' },
            ],
            UK: [
                { name: 'HMRC', code: 'UK-HMRC', country: 'UK', level: 'federal' },
            ],
        };
        return jurisdictions[country] || [];
    }
    static calculateDueDates(eventDef, taxYear, fiscalYearStart) {
        const dates = [];
        const fiscalStart = fiscalYearStart ? parseInt(fiscalYearStart.split('-')[0]) - 1 : 0; // Month offset
        if (eventDef.frequency === 'annually') {
            if (typeof eventDef.dueDate.month === 'number') {
                const date = new Date(taxYear, eventDef.dueDate.month - 1, eventDef.dueDate.day);
                if (eventDef.dueDate.day === -1) {
                    // Last day of month
                    date.setMonth(date.getMonth() + 1, 0);
                }
                dates.push(date);
            }
        }
        else if (eventDef.frequency === 'quarterly') {
            const quarterMonths = [3, 6, 9, 12]; // Calendar quarters
            for (const month of quarterMonths) {
                const adjustedMonth = (month + fiscalStart) % 12;
                const year = adjustedMonth < month ? taxYear + 1 : taxYear;
                let day = eventDef.dueDate.day;
                if (day === -1) {
                    // Last day of month following quarter
                    const date = new Date(year, adjustedMonth, 1);
                    date.setMonth(date.getMonth() + 1, 0);
                    day = date.getDate();
                }
                dates.push(new Date(year, adjustedMonth, day));
            }
        }
        else if (eventDef.frequency === 'monthly') {
            for (let month = 0; month < 12; month++) {
                const adjustedMonth = (month + fiscalStart) % 12;
                const year = adjustedMonth < month ? taxYear + 1 : taxYear;
                let day = eventDef.dueDate.day;
                if (day === -1) {
                    // Last day of month
                    const date = new Date(year, adjustedMonth + 1, 0);
                    day = date.getDate();
                }
                dates.push(new Date(year, adjustedMonth, day));
            }
        }
        return dates;
    }
    static async createReminders(calendarId, dueDate, reminderDays) {
        for (const days of reminderDays) {
            const reminderDate = new Date(dueDate);
            reminderDate.setDate(reminderDate.getDate() - days);
            const reminderId = generateId();
            await prisma.$executeRaw `
        INSERT INTO TaxReminder (id, tenantId, companyId, calendarId, reminderDate, reminderType, status, sentAt, createdAt)
        VALUES (${reminderId}, '', '', ${calendarId}, ${reminderDate}, 'email', 'pending', null, ${new Date()})
      `;
        }
    }
    static async createEvent(tenantId, companyId, data) {
        const validatedData = CreateTaxCalendarEventSchema.parse(data);
        const eventId = generateId();
        await prisma.$executeRaw `
      INSERT INTO TaxCalendar (
        id, tenantId, companyId, jurisdictionId, eventType, title, description,
        dueDate, formCodes, amount, isRecurring, frequency, reminderDays, priority,
        isCompleted, completedAt, createdAt, updatedAt
      )
      VALUES (
        ${eventId}, ${tenantId}, ${companyId}, ${validatedData.jurisdictionId},
        ${validatedData.eventType}, ${validatedData.title}, ${validatedData.description || null},
        ${new Date(validatedData.dueDate)}, ${JSON.stringify(validatedData.formCodes)},
        ${validatedData.amount || null}, ${validatedData.isRecurring}, ${validatedData.frequency || null},
        ${JSON.stringify(validatedData.reminderDays)}, ${validatedData.priority},
        false, null, ${new Date()}, ${new Date()}
      )
    `;
        const result = await prisma.$queryRaw `
      SELECT tc.*, tj.id as jurisdiction_id, tj.name as jurisdiction_name, tj.code as jurisdiction_code,
             tj.country as jurisdiction_country, tj.level as jurisdiction_level
      FROM TaxCalendar tc
      JOIN TaxJurisdiction tj ON tc.jurisdictionId = tj.id
      WHERE tc.id = ${eventId}
    `;
        return result[0];
    }
    static async getEvents(tenantId, companyId, filters = {}) {
        let query = `
      SELECT tc.*, tj.id as jurisdiction_id, tj.name as jurisdiction_name, tj.code as jurisdiction_code,
             tj.country as jurisdiction_country, tj.level as jurisdiction_level
      FROM TaxCalendar tc
      JOIN TaxJurisdiction tj ON tc.jurisdictionId = tj.id
      WHERE tc.tenantId = ? AND tc.companyId = ?
    `;
        const values = [tenantId, companyId];
        if (filters.fromDate) {
            query += ' AND tc.dueDate >= ? ';
            values.push(new Date(filters.fromDate));
        }
        if (filters.toDate) {
            query += ' AND tc.dueDate <= ? ';
            values.push(new Date(filters.toDate));
        }
        if (filters.eventType) {
            query += ' AND tc.eventType = ? ';
            values.push(filters.eventType);
        }
        if (filters.jurisdictionId) {
            query += ' AND tc.jurisdictionId = ? ';
            values.push(filters.jurisdictionId);
        }
        if (filters.isCompleted !== undefined) {
            query += ' AND tc.isCompleted = ? ';
            values.push(filters.isCompleted);
        }
        if (filters.priority) {
            query += ' AND tc.priority = ? ';
            values.push(filters.priority);
        }
        query += ' ORDER BY tc.dueDate ASC, tc.priority DESC ';
        const events = await prisma.$queryRawUnsafe(query, ...values);
        // Get reminders for each event
        for (const event of events) {
            const reminders = await prisma.$queryRaw `
        SELECT * FROM TaxReminder 
        WHERE calendarId = ${event.id} AND status = 'pending'
        ORDER BY reminderDate ASC
      `;
            event.reminders = reminders;
        }
        return events;
    }
    static async getUpcomingEvents(tenantId, companyId, daysAhead = 30) {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + daysAhead);
        return await this.getEvents(tenantId, companyId, {
            fromDate: today.toISOString(),
            toDate: futureDate.toISOString(),
            isCompleted: false,
        });
    }
    static async getOverdueEvents(tenantId, companyId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return await this.getEvents(tenantId, companyId, {
            toDate: today.toISOString(),
            isCompleted: false,
        });
    }
    static async updateEvent(id, tenantId, companyId, data) {
        const validatedData = UpdateTaxCalendarEventSchema.parse(data);
        let query = 'UPDATE TaxCalendar SET updatedAt = ? ';
        const values = [new Date()];
        if (validatedData.title) {
            query += ', title = ? ';
            values.push(validatedData.title);
        }
        if (validatedData.description !== undefined) {
            query += ', description = ? ';
            values.push(validatedData.description);
        }
        if (validatedData.dueDate) {
            query += ', dueDate = ? ';
            values.push(new Date(validatedData.dueDate));
        }
        if (validatedData.amount !== undefined) {
            query += ', amount = ? ';
            values.push(validatedData.amount);
        }
        if (validatedData.isCompleted !== undefined) {
            query += ', isCompleted = ?, completedAt = ? ';
            values.push(validatedData.isCompleted, validatedData.isCompleted ? new Date() : null);
        }
        if (validatedData.reminderDays) {
            query += ', reminderDays = ? ';
            values.push(JSON.stringify(validatedData.reminderDays));
        }
        if (validatedData.priority) {
            query += ', priority = ? ';
            values.push(validatedData.priority);
        }
        query += ' WHERE id = ? AND tenantId = ? AND companyId = ? ';
        values.push(id, tenantId, companyId);
        await prisma.$executeRawUnsafe(query, ...values);
        const result = await prisma.$queryRaw `
      SELECT tc.*, tj.id as jurisdiction_id, tj.name as jurisdiction_name, tj.code as jurisdiction_code,
             tj.country as jurisdiction_country, tj.level as jurisdiction_level
      FROM TaxCalendar tc
      JOIN TaxJurisdiction tj ON tc.jurisdictionId = tj.id
      WHERE tc.id = ${id} AND tc.tenantId = ${tenantId} AND tc.companyId = ${companyId}
    `;
        return result[0];
    }
    static async markCompleted(id, tenantId, companyId) {
        return await this.updateEvent(id, tenantId, companyId, {
            isCompleted: true,
        });
    }
    static async deleteEvent(id, tenantId, companyId) {
        // Delete associated reminders first
        await prisma.$executeRaw `
      DELETE FROM TaxReminder WHERE calendarId = ${id}
    `;
        await prisma.$executeRaw `
      DELETE FROM TaxCalendar WHERE id = ${id} AND tenantId = ${tenantId} AND companyId = ${companyId}
    `;
        return { success: true };
    }
    static async getCalendarSummary(tenantId, companyId) {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        const nextMonth = new Date();
        nextMonth.setDate(today.getDate() + 30);
        const [overdue, thisWeek, thisMonth, total] = await Promise.all([
            prisma.$queryRaw `
        SELECT COUNT(*) as count FROM TaxCalendar
        WHERE tenantId = ${tenantId} AND companyId = ${companyId}
          AND dueDate < ${today} AND isCompleted = false
      `,
            prisma.$queryRaw `
        SELECT COUNT(*) as count FROM TaxCalendar
        WHERE tenantId = ${tenantId} AND companyId = ${companyId}
          AND dueDate >= ${today} AND dueDate <= ${nextWeek} AND isCompleted = false
      `,
            prisma.$queryRaw `
        SELECT COUNT(*) as count FROM TaxCalendar
        WHERE tenantId = ${tenantId} AND companyId = ${companyId}
          AND dueDate >= ${today} AND dueDate <= ${nextMonth} AND isCompleted = false
      `,
            prisma.$queryRaw `
        SELECT COUNT(*) as count FROM TaxCalendar
        WHERE tenantId = ${tenantId} AND companyId = ${companyId}
      `,
        ]);
        const nextDeadline = await prisma.$queryRaw `
      SELECT tc.*, tj.id as jurisdiction_id, tj.name as jurisdiction_name, tj.code as jurisdiction_code,
             tj.country as jurisdiction_country, tj.level as jurisdiction_level
      FROM TaxCalendar tc
      JOIN TaxJurisdiction tj ON tc.jurisdictionId = tj.id
      WHERE tc.tenantId = ${tenantId} AND tc.companyId = ${companyId}
        AND tc.dueDate >= ${today} AND tc.isCompleted = false
      ORDER BY tc.dueDate ASC
      LIMIT 1
    `;
        return {
            overdue: Number(overdue[0]?.count || 0),
            thisWeek: Number(thisWeek[0]?.count || 0),
            thisMonth: Number(thisMonth[0]?.count || 0),
            total: Number(total[0]?.count || 0),
            nextDeadline: nextDeadline[0] || null,
        };
    }
    // Reminder Management
    static async processPendingReminders() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const reminders = await prisma.$queryRaw `
      SELECT tr.*, tc.title as calendar_title, tc.dueDate as calendar_dueDate, tc.priority as calendar_priority,
             tc.tenantId as calendar_tenantId, tc.companyId as calendar_companyId,
             tj.name as jurisdiction_name
      FROM TaxReminder tr
      JOIN TaxCalendar tc ON tr.calendarId = tc.id
      JOIN TaxJurisdiction tj ON tc.jurisdictionId = tj.id
      WHERE tr.reminderDate >= ${today} AND tr.reminderDate < ${tomorrow}
        AND tr.status = 'pending'
    `;
        for (const reminder of reminders) {
            try {
                await this.sendReminder(reminder);
                await prisma.$executeRaw `
          UPDATE TaxReminder 
          SET status = 'sent', sentAt = ${new Date()}
          WHERE id = ${reminder.id}
        `;
            }
            catch (error) {
                console.error(`Failed to send reminder ${reminder.id}:`, error);
                await prisma.$executeRaw `
          UPDATE TaxReminder 
          SET status = 'failed'
          WHERE id = ${reminder.id}
        `;
            }
        }
        return reminders.length;
    }
    static async sendReminder(reminder) {
        // This would integrate with your notification system
        // For now, we'll just log the reminder
        console.log(`Tax Reminder: ${reminder.calendar_title} due ${new Date(reminder.calendar_dueDate).toDateString()}`);
        // In a real implementation, you would:
        // 1. Get company contacts/users
        // 2. Send email notification
        // 3. Create in-app notification
        // 4. Send SMS if configured
        // Example notification data:
        const notificationData = {
            type: 'tax_reminder',
            title: 'Tax Deadline Approaching',
            content: `${reminder.calendar_title} is due on ${new Date(reminder.calendar_dueDate).toDateString()}`,
            priority: reminder.calendar_priority,
            companyId: reminder.calendar_companyId,
            metadata: {
                calendarEventId: reminder.calendarId,
                jurisdiction: reminder.jurisdiction_name,
            },
        };
        // Create in-app notification
        const notificationId = generateId();
        await prisma.$executeRaw `
      INSERT INTO Notification (
        id, tenantId, companyId, type, title, content, priority, metadata, createdAt, updatedAt
      )
      VALUES (
        ${notificationId}, ${reminder.calendar_tenantId}, ${reminder.calendar_companyId},
        ${notificationData.type}, ${notificationData.title}, ${notificationData.content},
        ${notificationData.priority}, ${JSON.stringify(notificationData.metadata)},
        ${new Date()}, ${new Date()}
      )
    `;
    }
    static async getReminders(tenantId, companyId, filters = {}) {
        let query = `
      SELECT tr.*, tc.title as calendar_title, tc.dueDate as calendar_dueDate,
             tj.id as jurisdiction_id, tj.name as jurisdiction_name, tj.code as jurisdiction_code
      FROM TaxReminder tr
      JOIN TaxCalendar tc ON tr.calendarId = tc.id
      JOIN TaxJurisdiction tj ON tc.jurisdictionId = tj.id
      WHERE tc.tenantId = ? AND tc.companyId = ?
    `;
        const values = [tenantId, companyId];
        if (filters.status) {
            query += ' AND tr.status = ? ';
            values.push(filters.status);
        }
        if (filters.fromDate) {
            query += ' AND tr.reminderDate >= ? ';
            values.push(new Date(filters.fromDate));
        }
        if (filters.toDate) {
            query += ' AND tr.reminderDate <= ? ';
            values.push(new Date(filters.toDate));
        }
        query += ' ORDER BY tr.reminderDate ASC ';
        return await prisma.$queryRawUnsafe(query, ...values);
    }
}
