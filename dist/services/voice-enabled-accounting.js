import { PrismaClient } from '@prisma/client';
import { EnhancedConversationalAIService } from './enhanced-conversational-ai';
const prisma = new PrismaClient();
// Voice-Enabled Accounting Service
export class VoiceEnabledAccountingService {
    conversationalAI;
    constructor() {
        this.conversationalAI = new EnhancedConversationalAIService();
    }
    // Initialize voice settings for a user
    async initializeVoiceSettings(companyId, userId) {
        const defaultSettings = {
            companyId,
            userId,
            isEnabled: true,
            language: 'en-US',
            voiceSpeed: 1.0,
            voiceType: 'neutral',
            wakeWord: 'UrutiIQ',
            autoTranscribe: true,
            noiseReduction: true,
            commands: this.getDefaultCommands(),
            metadata: {}
        };
        const settings = await prisma.voiceSettings.upsert({
            where: { companyId_userId: { companyId, userId } },
            update: {},
            create: defaultSettings
        });
        return this.mapVoiceSettingsFromDB(settings);
    }
    // Get voice settings for a user
    async getVoiceSettings(companyId, userId) {
        const settings = await prisma.voiceSettings.findUnique({
            where: { companyId_userId: { companyId, userId } },
            include: { commands: true }
        });
        if (!settings) {
            return this.initializeVoiceSettings(companyId, userId);
        }
        return this.mapVoiceSettingsFromDB(settings);
    }
    // Update voice settings
    async updateVoiceSettings(companyId, userId, updates) {
        const { commands, ...settingsUpdates } = updates;
        const settings = await prisma.voiceSettings.update({
            where: { companyId_userId: { companyId, userId } },
            data: {
                ...settingsUpdates,
                commands: commands ? {
                    deleteMany: {},
                    create: commands.map(cmd => ({
                        name: cmd.name,
                        description: cmd.description,
                        patterns: cmd.patterns,
                        action: cmd.action,
                        parameters: cmd.parameters,
                        isActive: cmd.isActive,
                        priority: cmd.priority
                    }))
                } : undefined
            },
            include: { commands: true }
        });
        return this.mapVoiceSettingsFromDB(settings);
    }
    // Start a voice session
    async startVoiceSession(companyId, userId, language) {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const session = await prisma.voiceSession.create({
            data: {
                companyId,
                userId,
                sessionId,
                startTime: new Date(),
                language: language || 'en-US',
                status: 'active',
                metadata: {}
            }
        });
        return this.mapVoiceSessionFromDB(session);
    }
    // Process voice command
    async processVoiceCommand(companyId, userId, audioData, sessionId) {
        try {
            // 1. Transcribe audio to text
            const transcription = await this.transcribeAudio(audioData);
            // 2. Parse command and extract intent
            const parsedCommand = await this.parseVoiceCommand(transcription, companyId);
            // 3. Execute the command
            const result = await this.executeVoiceCommand(parsedCommand, companyId, userId);
            // 4. Store command in database
            await this.storeVoiceCommand({
                companyId,
                userId,
                transcription,
                commandType: parsedCommand.action,
                confidence: parsedCommand.confidence,
                processed: true,
                result,
                sessionId
            });
            // 5. Generate voice response
            const audioResponse = await this.generateVoiceResponse(result.response);
            return {
                success: true,
                command: transcription,
                action: parsedCommand.action,
                parameters: parsedCommand.parameters,
                confidence: parsedCommand.confidence,
                response: result.response,
                audioResponse
            };
        }
        catch (error) {
            console.error('Error processing voice command:', error);
            const errorResponse = {
                success: false,
                command: '',
                action: 'error',
                parameters: {},
                confidence: 0,
                response: 'I apologize, but I encountered an error processing your voice command. Please try again.',
                audioResponse: undefined
            };
            // Store failed command
            await this.storeVoiceCommand({
                companyId,
                userId,
                transcription: '',
                commandType: 'query',
                confidence: 0,
                processed: false,
                result: errorResponse,
                sessionId
            });
            return errorResponse;
        }
    }
    // Get voice analytics
    async getVoiceAnalytics(companyId, userId, periodDays = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);
        const commands = await prisma.voiceCommand.findMany({
            where: {
                companyId,
                userId,
                createdAt: { gte: startDate }
            }
        });
        const sessions = await prisma.voiceSession.findMany({
            where: {
                companyId,
                userId,
                startTime: { gte: startDate }
            }
        });
        // Calculate analytics
        const totalCommands = commands.length;
        const successfulCommands = commands.filter(cmd => cmd.processed).length;
        const averageConfidence = commands.length > 0
            ? commands.reduce((sum, cmd) => sum + cmd.confidence, 0) / commands.length
            : 0;
        // Most used commands
        const commandCounts = commands.reduce((acc, cmd) => {
            const action = cmd.commandType;
            acc[action] = (acc[action] || 0) + 1;
            return acc;
        }, {});
        const mostUsedCommands = Object.entries(commandCounts)
            .map(([command, count]) => ({ command, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        // Language usage
        const languageUsage = sessions.reduce((acc, session) => {
            const lang = session.language;
            acc[lang] = (acc[lang] || 0) + 1;
            return acc;
        }, {});
        // Session duration
        const sessionDuration = sessions.reduce((total, session) => {
            if (session.endTime) {
                return total + (session.endTime.getTime() - session.startTime.getTime());
            }
            return total;
        }, 0) / 1000 / 60; // Convert to minutes
        const errorRate = totalCommands > 0 ? (totalCommands - successfulCommands) / totalCommands : 0;
        return {
            totalCommands,
            successfulCommands,
            averageConfidence,
            mostUsedCommands,
            sessionDuration,
            languageUsage,
            errorRate
        };
    }
    // Get voice command history
    async getVoiceCommandHistory(companyId, userId, limit = 50) {
        const commands = await prisma.voiceCommand.findMany({
            where: { companyId, userId },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
        return commands.map(cmd => this.mapVoiceCommandFromDB(cmd));
    }
    // End voice session
    async endVoiceSession(sessionId) {
        await prisma.voiceSession.update({
            where: { sessionId },
            data: {
                endTime: new Date(),
                status: 'ended'
            }
        });
    }
    // Private helper methods
    async transcribeAudio(audioData) {
        // TODO: Integrate with speech-to-text service (Google Speech-to-Text, AWS Transcribe, etc.)
        // For now, return a mock transcription
        return "add transaction for office supplies fifty dollars";
    }
    async parseVoiceCommand(transcription, companyId) {
        // Use the conversational AI service to parse the command
        const response = await this.conversationalAI.parseConversationalPrompt({
            prompt: transcription,
            companyId,
            context: 'voice_command',
            metadata: { source: 'voice' }
        });
        // Extract action and parameters from the AI response
        const action = this.extractActionFromResponse(response);
        const parameters = this.extractParametersFromResponse(response);
        const confidence = response.confidence || 0.8;
        return { action, parameters, confidence };
    }
    async executeVoiceCommand(parsedCommand, companyId, userId) {
        const { action, parameters } = parsedCommand;
        switch (action) {
            case 'add_transaction':
                return await this.handleAddTransaction(parameters, companyId, userId);
            case 'get_balance':
                return await this.handleGetBalance(parameters, companyId);
            case 'generate_report':
                return await this.handleGenerateReport(parameters, companyId);
            case 'categorize_transaction':
                return await this.handleCategorizeTransaction(parameters, companyId);
            case 'reconcile_account':
                return await this.handleReconcileAccount(parameters, companyId);
            case 'help':
                return await this.handleHelp();
            default:
                return {
                    response: `I'm sorry, I don't understand the command "${action}". Please try again or say "help" for available commands.`
                };
        }
    }
    async handleAddTransaction(parameters, companyId, userId) {
        try {
            const { amount, description, category, account } = parameters;
            // Create transaction using existing services
            const transaction = await prisma.transaction.create({
                data: {
                    companyId,
                    amount: parseFloat(amount),
                    description: description || 'Voice transaction',
                    category: category || 'Uncategorized',
                    accountId: account,
                    createdById: userId,
                    metadata: { source: 'voice_command' }
                }
            });
            return {
                response: `Transaction added successfully. Amount: $${amount}, Description: ${description}, Category: ${category}`
            };
        }
        catch (error) {
            return {
                response: 'Sorry, I encountered an error while adding the transaction. Please try again.'
            };
        }
    }
    async handleGetBalance(parameters, companyId) {
        try {
            const { account } = parameters;
            const balance = await prisma.account.findFirst({
                where: { id: account, companyId },
                select: { balance: true, name: true }
            });
            if (balance) {
                return {
                    response: `The current balance for ${balance.name} is $${balance.balance}`
                };
            }
            else {
                return {
                    response: 'Account not found. Please specify a valid account name.'
                };
            }
        }
        catch (error) {
            return {
                response: 'Sorry, I encountered an error while retrieving the balance. Please try again.'
            };
        }
    }
    async handleGenerateReport(parameters, companyId) {
        try {
            const { reportType, period } = parameters;
            // Use existing reporting service
            // This would integrate with the enhanced financial reporting service
            return {
                response: `I'm generating a ${reportType} report for the ${period} period. The report will be available in your dashboard shortly.`
            };
        }
        catch (error) {
            return {
                response: 'Sorry, I encountered an error while generating the report. Please try again.'
            };
        }
    }
    async handleCategorizeTransaction(parameters, companyId) {
        try {
            const { transactionId, category } = parameters;
            // Use existing auto-bookkeeper service
            // This would integrate with the auto-bookkeeper service
            return {
                response: `Transaction ${transactionId} has been categorized as ${category}`
            };
        }
        catch (error) {
            return {
                response: 'Sorry, I encountered an error while categorizing the transaction. Please try again.'
            };
        }
    }
    async handleReconcileAccount(parameters, companyId) {
        try {
            const { accountId } = parameters;
            // Use existing bank integration service
            // This would integrate with the enhanced bank integration service
            return {
                response: `I'm starting the reconciliation process for account ${accountId}. This may take a few moments.`
            };
        }
        catch (error) {
            return {
                response: 'Sorry, I encountered an error while starting the reconciliation. Please try again.'
            };
        }
    }
    async handleHelp() {
        return {
            response: `Here are the available voice commands: 
      - "Add transaction [amount] for [description]" to add a new transaction
      - "What's the balance of [account]" to check account balance
      - "Generate [report type] report" to create financial reports
      - "Categorize transaction [ID] as [category]" to categorize transactions
      - "Reconcile account [account]" to reconcile bank accounts
      - "Help" to hear this list again`
        };
    }
    async generateVoiceResponse(text) {
        // TODO: Integrate with text-to-speech service (Google Text-to-Speech, AWS Polly, etc.)
        // For now, return a mock audio URL
        return `data:audio/wav;base64,${Buffer.from(text).toString('base64')}`;
    }
    async storeVoiceCommand(data) {
        await prisma.voiceCommand.create({
            data: {
                companyId: data.companyId,
                userId: data.userId,
                transcription: data.transcription,
                commandType: data.commandType,
                confidence: data.confidence,
                processed: data.processed,
                result: data.result,
                sessionId: data.sessionId,
                metadata: {}
            }
        });
    }
    extractActionFromResponse(response) {
        // Extract action from AI response
        if (response.action)
            return response.action;
        if (response.intent)
            return response.intent;
        return 'unknown';
    }
    extractParametersFromResponse(response) {
        // Extract parameters from AI response
        return response.parameters || response.entities || {};
    }
    getDefaultCommands() {
        return [
            {
                id: 'add_transaction',
                name: 'Add Transaction',
                description: 'Add a new transaction via voice',
                patterns: ['add transaction', 'record transaction', 'new transaction'],
                action: 'add_transaction',
                parameters: ['amount', 'description', 'category'],
                isActive: true,
                priority: 1
            },
            {
                id: 'get_balance',
                name: 'Get Balance',
                description: 'Check account balance',
                patterns: ['what is the balance', 'check balance', 'account balance'],
                action: 'get_balance',
                parameters: ['account'],
                isActive: true,
                priority: 2
            },
            {
                id: 'generate_report',
                name: 'Generate Report',
                description: 'Generate financial reports',
                patterns: ['generate report', 'create report', 'show report'],
                action: 'generate_report',
                parameters: ['reportType', 'period'],
                isActive: true,
                priority: 3
            },
            {
                id: 'help',
                name: 'Help',
                description: 'Get help with voice commands',
                patterns: ['help', 'what can you do', 'commands'],
                action: 'help',
                parameters: [],
                isActive: true,
                priority: 10
            }
        ];
    }
    mapVoiceSettingsFromDB(dbSettings) {
        return {
            id: dbSettings.id,
            companyId: dbSettings.companyId,
            userId: dbSettings.userId,
            isEnabled: dbSettings.isEnabled,
            language: dbSettings.language,
            voiceSpeed: dbSettings.voiceSpeed,
            voiceType: dbSettings.voiceType,
            wakeWord: dbSettings.wakeWord,
            autoTranscribe: dbSettings.autoTranscribe,
            noiseReduction: dbSettings.noiseReduction,
            commands: dbSettings.commands?.map(this.mapVoiceCommandConfigFromDB) || [],
            metadata: dbSettings.metadata
        };
    }
    mapVoiceCommandConfigFromDB(dbCommand) {
        return {
            id: dbCommand.id,
            name: dbCommand.name,
            description: dbCommand.description,
            patterns: dbCommand.patterns,
            action: dbCommand.action,
            parameters: dbCommand.parameters,
            isActive: dbCommand.isActive,
            priority: dbCommand.priority
        };
    }
    mapVoiceSessionFromDB(dbSession) {
        return {
            id: dbSession.id,
            companyId: dbSession.companyId,
            userId: dbSession.userId,
            sessionId: dbSession.sessionId,
            startTime: dbSession.startTime,
            endTime: dbSession.endTime,
            commands: [],
            language: dbSession.language,
            status: dbSession.status,
            metadata: dbSession.metadata
        };
    }
    mapVoiceCommandFromDB(dbCommand) {
        return {
            id: dbCommand.id,
            companyId: dbCommand.companyId,
            userId: dbCommand.userId,
            audioUrl: dbCommand.audioUrl,
            transcription: dbCommand.transcription,
            commandType: dbCommand.commandType,
            confidence: dbCommand.confidence,
            processed: dbCommand.processed,
            result: dbCommand.result,
            metadata: dbCommand.metadata,
            createdAt: dbCommand.createdAt
        };
    }
}
