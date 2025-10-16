export class AdvancedSchedulingService {
    /**
     * Calculate next run date with advanced scheduling options
     */
    static calculateNextRunDate(currentDate, frequency, interval, options = {}) {
        const { dayOfWeek, dayOfMonth, businessDaysOnly = false, skipHolidays = false, timezone = 'UTC' } = options;
        let nextDate = new Date(currentDate);
        // Apply timezone offset if specified
        if (timezone !== 'UTC') {
            const timezoneOffset = this.getTimezoneOffset(timezone);
            nextDate = new Date(nextDate.getTime() + timezoneOffset);
        }
        switch (frequency) {
            case 'daily':
                nextDate.setDate(nextDate.getDate() + interval);
                break;
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + (7 * interval));
                if (dayOfWeek !== undefined) {
                    // Adjust to specific day of week
                    const currentDay = nextDate.getDay();
                    const daysToAdd = (dayOfWeek - currentDay + 7) % 7;
                    nextDate.setDate(nextDate.getDate() + daysToAdd);
                }
                break;
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + interval);
                if (dayOfMonth !== undefined) {
                    // Adjust to specific day of month
                    const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
                    const targetDay = Math.min(dayOfMonth, lastDayOfMonth);
                    nextDate.setDate(targetDay);
                }
                break;
            case 'quarterly':
                nextDate.setMonth(nextDate.getMonth() + (3 * interval));
                if (dayOfMonth !== undefined) {
                    const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
                    const targetDay = Math.min(dayOfMonth, lastDayOfMonth);
                    nextDate.setDate(targetDay);
                }
                break;
            case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + interval);
                if (dayOfMonth !== undefined) {
                    const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
                    const targetDay = Math.min(dayOfMonth, lastDayOfMonth);
                    nextDate.setDate(targetDay);
                }
                break;
            default:
                throw new Error(`Unsupported frequency: ${frequency}`);
        }
        // Apply business days only logic
        if (businessDaysOnly) {
            nextDate = this.adjustToBusinessDay(nextDate);
        }
        // Apply holiday skipping logic
        if (skipHolidays) {
            nextDate = this.skipHolidays(nextDate);
        }
        return nextDate;
    }
    /**
     * Adjust date to next business day (Monday-Friday)
     */
    static adjustToBusinessDay(date) {
        const dayOfWeek = date.getDay();
        // If it's Saturday (6), move to Monday
        if (dayOfWeek === 6) {
            date.setDate(date.getDate() + 2);
        }
        // If it's Sunday (0), move to Monday
        else if (dayOfWeek === 0) {
            date.setDate(date.getDate() + 1);
        }
        return date;
    }
    /**
     * Skip holidays (basic implementation - can be enhanced with holiday calendar)
     */
    static skipHolidays(date) {
        // Basic holiday detection (can be enhanced with proper holiday calendar)
        const month = date.getMonth();
        const day = date.getDate();
        // Skip common holidays (simplified)
        const holidays = [
            { month: 0, day: 1 }, // New Year's Day
            { month: 6, day: 4 }, // Independence Day (US)
            { month: 11, day: 25 }, // Christmas Day
        ];
        for (const holiday of holidays) {
            if (month === holiday.month && day === holiday.day) {
                date.setDate(date.getDate() + 1);
                // Recursively check if the next day is also a holiday
                return this.skipHolidays(date);
            }
        }
        return date;
    }
    /**
     * Get timezone offset in milliseconds
     */
    static getTimezoneOffset(timezone) {
        // Simplified timezone offset calculation
        // In production, use a proper timezone library like moment-timezone
        const timezoneOffsets = {
            'UTC': 0,
            'EST': -5 * 60 * 60 * 1000,
            'PST': -8 * 60 * 60 * 1000,
            'CET': 1 * 60 * 60 * 1000,
            'JST': 9 * 60 * 60 * 1000,
        };
        return timezoneOffsets[timezone] || 0;
    }
    /**
     * Check if a recurring invoice should be skipped based on conditional logic
     */
    static async shouldSkipRecurringInvoice(recurring, customer) {
        // Check if customer is inactive
        if (recurring.skipIfCustomerInactive && customer.status !== 'active') {
            return { shouldSkip: true, reason: 'Customer is inactive' };
        }
        // Check outstanding balance
        if (recurring.skipIfOutstandingBalance) {
            const outstandingBalance = customer.outstandingBalance || 0;
            const maxAmount = recurring.maxOutstandingAmount || 0;
            if (outstandingBalance > maxAmount) {
                return {
                    shouldSkip: true,
                    reason: `Outstanding balance (${outstandingBalance}) exceeds maximum allowed (${maxAmount})`
                };
            }
        }
        return { shouldSkip: false };
    }
    /**
     * Get available timezones
     */
    static getAvailableTimezones() {
        return [
            { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
            { value: 'EST', label: 'EST (Eastern Standard Time)' },
            { value: 'PST', label: 'PST (Pacific Standard Time)' },
            { value: 'CET', label: 'CET (Central European Time)' },
            { value: 'JST', label: 'JST (Japan Standard Time)' },
            { value: 'GMT', label: 'GMT (Greenwich Mean Time)' },
            { value: 'IST', label: 'IST (India Standard Time)' },
            { value: 'AEST', label: 'AEST (Australian Eastern Standard Time)' },
        ];
    }
    /**
     * Get day of week options
     */
    static getDayOfWeekOptions() {
        return [
            { value: 0, label: 'Sunday' },
            { value: 1, label: 'Monday' },
            { value: 2, label: 'Tuesday' },
            { value: 3, label: 'Wednesday' },
            { value: 4, label: 'Thursday' },
            { value: 5, label: 'Friday' },
            { value: 6, label: 'Saturday' },
        ];
    }
    /**
     * Get day of month options
     */
    static getDayOfMonthOptions() {
        const options = [];
        for (let i = 1; i <= 31; i++) {
            options.push({ value: i, label: `${i}${this.getOrdinalSuffix(i)}` });
        }
        return options;
    }
    /**
     * Get ordinal suffix for day numbers
     */
    static getOrdinalSuffix(day) {
        if (day >= 11 && day <= 13) {
            return 'th';
        }
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    }
}
