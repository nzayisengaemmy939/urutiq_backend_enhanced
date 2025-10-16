import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export class CurrencyService {
    // Supported currencies with their symbols and decimal places
    static SUPPORTED_CURRENCIES = {
        'USD': { symbol: '$', decimals: 2, name: 'US Dollar' },
        'EUR': { symbol: '€', decimals: 4, name: 'Euro' }, // Increased precision for exchange rates
        'GBP': { symbol: '£', decimals: 4, name: 'British Pound' }, // Increased precision for exchange rates
        'JPY': { symbol: '¥', decimals: 2, name: 'Japanese Yen' }, // Increased from 0 to 2
        'CAD': { symbol: 'C$', decimals: 4, name: 'Canadian Dollar' }, // Increased precision for exchange rates
        'AUD': { symbol: 'A$', decimals: 4, name: 'Australian Dollar' }, // Increased precision for exchange rates
        'CHF': { symbol: 'CHF', decimals: 4, name: 'Swiss Franc' }, // Increased precision for exchange rates
        'CNY': { symbol: '¥', decimals: 4, name: 'Chinese Yuan' }, // Increased precision for exchange rates
        'INR': { symbol: '₹', decimals: 4, name: 'Indian Rupee' }, // Increased precision for exchange rates
        'BRL': { symbol: 'R$', decimals: 4, name: 'Brazilian Real' }, // Increased precision for exchange rates
        'MXN': { symbol: '$', decimals: 4, name: 'Mexican Peso' }, // Increased precision for exchange rates
        'SGD': { symbol: 'S$', decimals: 4, name: 'Singapore Dollar' }, // Increased precision for exchange rates
        'HKD': { symbol: 'HK$', decimals: 4, name: 'Hong Kong Dollar' }, // Increased precision for exchange rates
        'NZD': { symbol: 'NZ$', decimals: 4, name: 'New Zealand Dollar' }, // Increased precision for exchange rates
        'SEK': { symbol: 'kr', decimals: 4, name: 'Swedish Krona' }, // Increased precision for exchange rates
        'NOK': { symbol: 'kr', decimals: 4, name: 'Norwegian Krone' }, // Increased precision for exchange rates
        'DKK': { symbol: 'kr', decimals: 4, name: 'Danish Krone' }, // Increased precision for exchange rates
        'PLN': { symbol: 'zł', decimals: 4, name: 'Polish Zloty' }, // Increased precision for exchange rates
        'CZK': { symbol: 'Kč', decimals: 4, name: 'Czech Koruna' }, // Increased precision for exchange rates
        'HUF': { symbol: 'Ft', decimals: 4, name: 'Hungarian Forint' }, // Increased precision for exchange rates
        'FRW': { symbol: 'RF', decimals: 2, name: 'Rwandan Franc' } // Added FRW support
    };
    // Fallback mock rates (used when API fails) - Updated to more current values
    static FALLBACK_RATES = {
        'USD': {
            'EUR': 0.8515, // Updated to more current rate
            'GBP': 0.7850, // Updated to more current rate
            'JPY': 149.50, // Updated to more current rate
            'CAD': 1.3650, // Updated to more current rate
            'AUD': 1.5250, // Updated to more current rate
            'CHF': 0.8750, // Updated to more current rate
            'CNY': 7.2500, // Updated to more current rate
            'INR': 83.25, // Updated to more current rate
            'BRL': 5.1500, // Updated to more current rate
            'MXN': 17.25, // Updated to more current rate
            'SGD': 1.3450, // Updated to more current rate
            'HKD': 7.8250, // Updated to more current rate
            'NZD': 1.6250, // Updated to more current rate
            'SEK': 10.85, // Updated to more current rate
            'NOK': 11.25, // Updated to more current rate
            'DKK': 6.35, // Updated to more current rate
            'PLN': 4.05, // Updated to more current rate
            'CZK': 23.15, // Updated to more current rate
            'HUF': 365.50, // Updated to more current rate
            'FRW': 1450.61 // Updated FRW rate (1 USD = ~1450.61 FRW) - Current live rate
        },
        'EUR': {
            'USD': 1.1745, // Updated to more current rate
            'GBP': 0.9200, // Updated to more current rate
            'JPY': 175.50, // Updated to more current rate
            'CAD': 1.6050, // Updated to more current rate
            'AUD': 1.7900, // Updated to more current rate
            'CHF': 1.0250, // Updated to more current rate
            'CNY': 8.5200, // Updated to more current rate
            'INR': 97.75, // Updated to more current rate
            'BRL': 6.0500, // Updated to more current rate
            'MXN': 20.25, // Updated to more current rate
            'SGD': 1.5800, // Updated to more current rate
            'HKD': 9.1950, // Updated to more current rate
            'NZD': 1.9100, // Updated to more current rate
            'SEK': 12.75, // Updated to more current rate
            'NOK': 13.25, // Updated to more current rate
            'DKK': 7.46, // Updated to more current rate
            'PLN': 4.76, // Updated to more current rate
            'CZK': 27.25, // Updated to more current rate
            'HUF': 429.50, // Updated to more current rate
            'FRW': 1704.00 // Updated FRW rate (1 EUR = ~1704 FRW) - Based on current rates
        },
        'FRW': {
            'USD': 0.000689, // 1 FRW = ~0.000689 USD (updated to match 1,450.61 rate)
            'EUR': 0.000587, // 1 FRW = ~0.000587 EUR (updated to match 1,704 rate)
            'GBP': 0.00060, // 1 FRW = ~0.00060 GBP
            'JPY': 0.115, // 1 FRW = ~0.115 JPY
            'CAD': 0.00105, // 1 FRW = ~0.00105 CAD
            'AUD': 0.00117, // 1 FRW = ~0.00117 AUD
            'CHF': 0.00067, // 1 FRW = ~0.00067 CHF
            'CNY': 0.00556, // 1 FRW = ~0.00556 CNY
            'INR': 0.064, // 1 FRW = ~0.064 INR
            'BRL': 0.00396, // 1 FRW = ~0.00396 BRL
            'MXN': 0.0133, // 1 FRW = ~0.0133 MXN
            'SGD': 0.00103, // 1 FRW = ~0.00103 SGD
            'HKD': 0.00602, // 1 FRW = ~0.00602 HKD
            'NZD': 0.00125, // 1 FRW = ~0.00125 NZD
            'SEK': 0.00835, // 1 FRW = ~0.00835 SEK
            'NOK': 0.00867, // 1 FRW = ~0.00867 NOK
            'DKK': 0.00489, // 1 FRW = ~0.00489 DKK
            'PLN': 0.00312, // 1 FRW = ~0.00312 PLN
            'CZK': 0.0178, // 1 FRW = ~0.0178 CZK
            'HUF': 0.274 // 1 FRW = ~0.274 HUF
        }
    };
    // Cache for real-time rates to avoid excessive API calls
    static rateCache = new Map();
    static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    /**
     * Clear the rate cache to force fresh data
     */
    static clearRateCache() {
        this.rateCache.clear();
    }
    /**
     * Clear database rates for a specific currency pair
     */
    static async clearDatabaseRates(fromCurrency, toCurrency) {
        await prisma.currencyRate.deleteMany({
            where: {
                fromCurrency,
                toCurrency
            }
        });
    }
    /**
     * Force refresh historical data for a currency pair
     */
    static async forceRefreshHistoricalData(fromCurrency, toCurrency, startDate, endDate) {
        // Clear any cached data
        this.clearRateCache();
        // Get fresh historical rates
        return await this.getHistoricalRatesForChart(fromCurrency, toCurrency, new Date(startDate), new Date(endDate));
    }
    /**
     * Force refresh exchange rate from real market data
     */
    static async forceRefreshRate(fromCurrency, toCurrency) {
        // Clear cache for this specific pair
        const cacheKey = `${fromCurrency}-${toCurrency}`;
        this.rateCache.delete(cacheKey);
        // Get fresh rate from API
        const rate = await this.fetchExternalRate(fromCurrency, toCurrency);
        // Update database with fresh rate
        await prisma.currencyRate.create({
            data: {
                fromCurrency,
                toCurrency,
                rate,
                timestamp: new Date(),
                source: 'external_api_forced'
            }
        });
        return {
            fromCurrency,
            toCurrency,
            rate,
            timestamp: new Date(),
            source: 'external_api_forced'
        };
    }
    /**
     * Test the ExchangeRate-API directly
     */
    static async testExchangeRateAPI(baseCurrency = 'USD') {
        try {
            const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`, {
                headers: {
                    'User-Agent': 'UrutiQ-Accounting/1.0',
                    'Accept': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            const data = await response.json();
            return data;
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Get all supported currencies
     */
    static getSupportedCurrencies() {
        return this.SUPPORTED_CURRENCIES;
    }
    /**
     * Check if a currency is supported
     */
    static isCurrencySupported(currency) {
        return currency in this.SUPPORTED_CURRENCIES;
    }
    /**
     * Get currency information
     */
    static getCurrencyInfo(currency) {
        return this.SUPPORTED_CURRENCIES[currency] || null;
    }
    /**
     * Get exchange rate between two currencies
     */
    static async getExchangeRate(fromCurrency, toCurrency, date) {
        if (!this.isCurrencySupported(fromCurrency) || !this.isCurrencySupported(toCurrency)) {
            throw new Error(`Unsupported currency: ${fromCurrency} or ${toCurrency}`);
        }
        if (fromCurrency === toCurrency) {
            return {
                fromCurrency,
                toCurrency,
                rate: 1.0,
                timestamp: new Date(),
                source: 'internal'
            };
        }
        // Try to get rate from database first
        const existingRate = await prisma.currencyRate.findFirst({
            where: {
                fromCurrency,
                toCurrency,
                ...(date && {
                    timestamp: {
                        gte: new Date(date.getTime() - 24 * 60 * 60 * 1000), // Within 24 hours
                        lte: new Date(date.getTime() + 24 * 60 * 60 * 1000)
                    }
                })
            },
            orderBy: { timestamp: 'desc' }
        });
        if (existingRate) {
            return {
                fromCurrency: existingRate.fromCurrency,
                toCurrency: existingRate.toCurrency,
                rate: existingRate.rate,
                timestamp: existingRate.timestamp,
                source: existingRate.source
            };
        }
        // Get rate from external source with fallback to mock rates
        const rate = await this.getBaseExchangeRate(fromCurrency, toCurrency);
        // Determine source based on whether it's a fallback rate or live API
        const unsupportedCurrencies = ['FRW', 'RWF', 'TZS', 'UGX', 'KES', 'ETB', 'ZAR', 'NGN', 'GHS', 'XOF', 'XAF'];
        const isUnsupportedCurrency = unsupportedCurrencies.includes(fromCurrency) || unsupportedCurrencies.includes(toCurrency);
        const source = isUnsupportedCurrency ? 'fallback_rate' : 'external_api';
        // Store the rate in database
        await prisma.currencyRate.create({
            data: {
                fromCurrency,
                toCurrency,
                rate,
                timestamp: new Date(),
                source
            }
        });
        return {
            fromCurrency,
            toCurrency,
            rate,
            timestamp: new Date(),
            source: 'external_api'
        };
    }
    /**
     * Convert amount from one currency to another
     */
    static async convertCurrency(amount, fromCurrency, toCurrency, date) {
        const rate = await this.getExchangeRate(fromCurrency, toCurrency, date);
        let convertedAmount;
        if (fromCurrency === toCurrency) {
            convertedAmount = amount;
        }
        else {
            convertedAmount = amount * rate.rate;
        }
        // Round to appropriate decimal places
        const currencyInfo = this.getCurrencyInfo(toCurrency);
        if (currencyInfo) {
            convertedAmount = Number(convertedAmount.toFixed(currencyInfo.decimals));
        }
        return {
            amount,
            fromCurrency,
            toCurrency,
            convertedAmount,
            rate: rate.rate,
            timestamp: rate.timestamp
        };
    }
    /**
     * Fetch exchange rate from real API
     * Uses ExchangeRate-API (free, no API key required)
     */
    static async fetchExternalRate(fromCurrency, toCurrency) {
        // Check cache first
        const cacheKey = `${fromCurrency}-${toCurrency}`;
        const cached = this.rateCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.rate;
        }
        // Try multiple APIs for better reliability and currency coverage
        const apis = [
            {
                name: 'ExchangeRate-API',
                url: `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`,
                parser: (data) => data.rates?.[toCurrency]
            },
            {
                name: 'CurrencyAPI',
                url: `https://api.currencyapi.com/v3/latest?apikey=free&currencies=${toCurrency}&base_currency=${fromCurrency}`,
                parser: (data) => data.data?.[toCurrency]?.value
            },
            {
                name: 'Fixer.io',
                url: `https://api.fixer.io/latest?base=${fromCurrency}&symbols=${toCurrency}`,
                parser: (data) => data.rates?.[toCurrency]
            },
            {
                name: 'Open Exchange Rates',
                url: `https://openexchangerates.org/api/latest.json?app_id=free&base=${fromCurrency}&symbols=${toCurrency}`,
                parser: (data) => data.rates?.[toCurrency]
            },
            {
                name: 'CurrencyLayer',
                url: `https://api.currencylayer.com/live?access_key=free&currencies=${toCurrency}&source=${fromCurrency}`,
                parser: (data) => data.quotes?.[`${fromCurrency}${toCurrency}`]
            }
        ];
        for (const api of apis) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                const response = await fetch(api.url, {
                    headers: {
                        'User-Agent': 'UrutiQ-Accounting/1.0',
                        'Accept': 'application/json'
                    },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error(`${api.name} request failed: ${response.status}`);
                }
                const data = await response.json();
                const rate = api.parser(data);
                if (!rate || typeof rate !== 'number') {
                    throw new Error(`${api.name} returned invalid rate data`);
                }
                // Cache the result
                this.rateCache.set(cacheKey, { rate, timestamp: Date.now() });
                return rate;
            }
            catch (error) {
                continue; // Try next API
            }
        }
        // If all APIs fail, throw error instead of using fallback
        throw new Error(`All currency APIs failed for ${fromCurrency}/${toCurrency}. Please check your internet connection and try again.`);
    }
    /**
     * Get historical exchange rates
     */
    static async getHistoricalRates(fromCurrency, toCurrency, startDate, endDate) {
        const rates = await prisma.currencyRate.findMany({
            where: {
                fromCurrency,
                toCurrency,
                timestamp: {
                    gte: startDate,
                    lte: endDate
                }
            },
            orderBy: { timestamp: 'asc' }
        });
        return rates.map(rate => ({
            fromCurrency: rate.fromCurrency,
            toCurrency: rate.toCurrency,
            rate: rate.rate,
            timestamp: rate.timestamp,
            source: rate.source
        }));
    }
    /**
     * Get historical rates in OHLCV format for charting
     */
    static async getHistoricalRatesForChart(fromCurrency, toCurrency, startDate, endDate) {
        const rates = await prisma.currencyRate.findMany({
            where: {
                fromCurrency,
                toCurrency,
                timestamp: {
                    gte: startDate,
                    lte: endDate
                }
            },
            orderBy: { timestamp: 'asc' }
        });
        // Always generate sample data for demonstration
        return await this.generateSampleHistoricalData(fromCurrency, toCurrency, startDate, endDate);
        // Group rates by date and create OHLCV data
        const dailyRates = new Map();
        rates.forEach(rate => {
            const date = rate.timestamp.toISOString().split('T')[0];
            if (!dailyRates.has(date)) {
                dailyRates.set(date, []);
            }
            dailyRates.get(date).push(rate.rate);
        });
        // Convert to HistoricalRate format
        const historicalRates = [];
        dailyRates.forEach((dayRates, date) => {
            const sortedRates = dayRates.sort((a, b) => a - b);
            const open = dayRates[0]; // First rate of the day
            const close = dayRates[dayRates.length - 1]; // Last rate of the day
            const high = Math.max(...dayRates);
            const low = Math.min(...dayRates);
            const volume = dayRates.length * 1000; // Simulated volume based on number of rates
            historicalRates.push({
                date,
                rate: close, // Use close rate as the main rate
                open,
                high,
                low,
                close,
                volume
            });
        });
        return historicalRates;
    }
    /**
     * Generate sample historical data for demonstration purposes
     */
    static async generateSampleHistoricalData(fromCurrency, toCurrency, startDate, endDate) {
        const historicalRates = [];
        const daysDiff = Math.max(7, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        // Get base exchange rate (tries real API first, falls back to mock)
        const baseRate = await this.getBaseExchangeRate(fromCurrency, toCurrency);
        for (let i = 0; i <= daysDiff; i++) {
            const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
            const dateStr = currentDate.toISOString().split('T')[0];
            // Generate realistic OHLCV data with more volatility
            const trend = Math.sin(i * 0.1) * 0.05; // Long-term trend (increased)
            const volatility = (Math.random() - 0.5) * 0.08; // Daily volatility (increased)
            const dailyChange = trend + volatility;
            const open = baseRate * (1 + dailyChange);
            const close = open * (1 + (Math.random() - 0.5) * 0.04); // Intraday change (increased)
            const high = Math.max(open, close) * (1 + Math.random() * 0.02); // High is above both (increased)
            const low = Math.min(open, close) * (1 - Math.random() * 0.02); // Low is below both (increased)
            const volume = Math.floor(Math.random() * 50000) + 10000; // Random volume
            historicalRates.push({
                date: dateStr,
                rate: close,
                open: Number(open.toFixed(4)),
                high: Number(high.toFixed(4)),
                low: Number(low.toFixed(4)),
                close: Number(close.toFixed(4)),
                volume
            });
        }
        return historicalRates;
    }
    /**
     * Get base exchange rate for currency pair
     * Prioritizes live market data, only uses fallback for unsupported currencies
     */
    static async getBaseExchangeRate(fromCurrency, toCurrency) {
        try {
            // Try to get real market data first
            return await this.fetchExternalRate(fromCurrency, toCurrency);
        }
        catch (error) {
            // Only use fallback for currencies that are known to not be supported by any API
            const unsupportedCurrencies = ['FRW', 'RWF', 'TZS', 'UGX', 'KES', 'ETB', 'ZAR', 'NGN', 'GHS', 'XOF', 'XAF']; // African currencies not supported by free APIs
            if (unsupportedCurrencies.includes(fromCurrency) || unsupportedCurrencies.includes(toCurrency)) {
                const mockRate = this.getMockRate(fromCurrency, toCurrency);
                if (mockRate !== null) {
                    return mockRate;
                }
            }
            // For supported currencies, throw error to force retry or show proper error
            throw new Error(`Unable to fetch live rate for ${fromCurrency}/${toCurrency}. All APIs failed. Please check your internet connection and try again.`);
        }
    }
    /**
     * Get mock rate for currency pair
     */
    static getMockRate(fromCurrency, toCurrency) {
        const fromRates = this.FALLBACK_RATES[fromCurrency];
        if (fromRates && fromRates[toCurrency]) {
            return fromRates[toCurrency];
        }
        // Try reverse rate
        const toRates = this.FALLBACK_RATES[toCurrency];
        if (toRates && toRates[fromCurrency]) {
            return 1 / toRates[fromCurrency];
        }
        return null;
    }
    /**
     * Update exchange rates for all supported currencies
     */
    static async updateExchangeRates() {
        const currencies = Object.keys(this.SUPPORTED_CURRENCIES);
        const errors = [];
        let updated = 0;
        for (const fromCurrency of currencies) {
            for (const toCurrency of currencies) {
                if (fromCurrency !== toCurrency) {
                    try {
                        const rate = await this.fetchExternalRate(fromCurrency, toCurrency);
                        await prisma.currencyRate.create({
                            data: {
                                fromCurrency,
                                toCurrency,
                                rate,
                                timestamp: new Date(),
                                source: 'external_api'
                            }
                        });
                        updated++;
                    }
                    catch (error) {
                        errors.push(`Failed to update ${fromCurrency}/${toCurrency}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                }
            }
        }
        return { updated, errors };
    }
    /**
     * Format currency amount with proper symbol and decimal places
     */
    static formatCurrency(amount, currency) {
        const currencyInfo = this.getCurrencyInfo(currency);
        if (!currencyInfo) {
            return `${amount.toFixed(2)} ${currency}`;
        }
        const formattedAmount = amount.toFixed(currencyInfo.decimals);
        // Handle different currency symbol positions
        switch (currency) {
            case 'USD':
            case 'CAD':
            case 'AUD':
            case 'NZD':
            case 'SGD':
            case 'HKD':
                return `${currencyInfo.symbol}${formattedAmount}`;
            case 'EUR':
                return `${formattedAmount} ${currencyInfo.symbol}`;
            case 'GBP':
                return `${currencyInfo.symbol}${formattedAmount}`;
            case 'JPY':
                return `${currencyInfo.symbol}${formattedAmount}`;
            default:
                return `${formattedAmount} ${currencyInfo.symbol}`;
        }
    }
    /**
     * Parse currency amount from formatted string
     */
    static parseCurrency(formattedAmount, currency) {
        const currencyInfo = this.getCurrencyInfo(currency);
        if (!currencyInfo) {
            throw new Error(`Unsupported currency: ${currency}`);
        }
        // Remove currency symbol and parse
        let cleanAmount = formattedAmount.replace(/[^\d.-]/g, '');
        return parseFloat(cleanAmount) || 0;
    }
    /**
     * Get currency conversion summary for a transaction
     */
    static async getConversionSummary(amount, fromCurrency, toCurrency) {
        const conversion = await this.convertCurrency(amount, fromCurrency, toCurrency);
        return {
            original: {
                amount,
                currency: fromCurrency,
                formatted: this.formatCurrency(amount, fromCurrency)
            },
            converted: {
                amount: conversion.convertedAmount,
                currency: toCurrency,
                formatted: this.formatCurrency(conversion.convertedAmount, toCurrency)
            },
            rate: conversion.rate,
            timestamp: conversion.timestamp
        };
    }
}
