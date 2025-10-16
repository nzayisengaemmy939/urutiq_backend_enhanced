import express from 'express';
import { VoiceEnabledAccountingService } from '../services/voice-enabled-accounting.js';
const router = express.Router();
const voiceService = new VoiceEnabledAccountingService();
// Voice Settings Management
router.get('/settings/:companyId/:userId', async (req, res) => {
    try {
        const { companyId, userId } = req.params;
        const settings = await voiceService.getVoiceSettings(companyId, userId);
        res.json({ success: true, data: settings });
    }
    catch (error) {
        console.error('Error getting voice settings:', error);
        res.status(500).json({ success: false, error: 'Failed to get voice settings' });
    }
});
router.put('/settings/:companyId/:userId', async (req, res) => {
    try {
        const { companyId, userId } = req.params;
        const updates = req.body;
        const settings = await voiceService.updateVoiceSettings(companyId, userId, updates);
        res.json({ success: true, data: settings });
    }
    catch (error) {
        console.error('Error updating voice settings:', error);
        res.status(500).json({ success: false, error: 'Failed to update voice settings' });
    }
});
router.post('/settings/:companyId/:userId/initialize', async (req, res) => {
    try {
        const { companyId, userId } = req.params;
        const settings = await voiceService.initializeVoiceSettings(companyId, userId);
        res.json({ success: true, data: settings });
    }
    catch (error) {
        console.error('Error initializing voice settings:', error);
        res.status(500).json({ success: false, error: 'Failed to initialize voice settings' });
    }
});
// Voice Session Management
router.post('/session/:companyId/:userId/start', async (req, res) => {
    try {
        const { companyId, userId } = req.params;
        const { language } = req.body;
        const session = await voiceService.startVoiceSession(companyId, userId, language);
        res.json({ success: true, data: session });
    }
    catch (error) {
        console.error('Error starting voice session:', error);
        res.status(500).json({ success: false, error: 'Failed to start voice session' });
    }
});
router.put('/session/:sessionId/end', async (req, res) => {
    try {
        const { sessionId } = req.params;
        await voiceService.endVoiceSession(sessionId);
        res.json({ success: true, message: 'Voice session ended successfully' });
    }
    catch (error) {
        console.error('Error ending voice session:', error);
        res.status(500).json({ success: false, error: 'Failed to end voice session' });
    }
});
// Voice Command Processing
router.post('/command/:companyId/:userId/process', async (req, res) => {
    try {
        const { companyId, userId } = req.params;
        const { audioData, sessionId } = req.body;
        if (!audioData) {
            return res.status(400).json({ success: false, error: 'Audio data is required' });
        }
        // Convert base64 audio data to Buffer
        const audioBuffer = Buffer.from(audioData, 'base64');
        const result = await voiceService.processVoiceCommand(companyId, userId, audioBuffer, sessionId);
        res.json({ success: true, data: result });
    }
    catch (error) {
        console.error('Error processing voice command:', error);
        res.status(500).json({ success: false, error: 'Failed to process voice command' });
    }
});
// Voice Command History
router.get('/commands/:companyId/:userId', async (req, res) => {
    try {
        const { companyId, userId } = req.params;
        const { limit } = req.query;
        const commands = await voiceService.getVoiceCommandHistory(companyId, userId, limit ? parseInt(limit) : 50);
        res.json({ success: true, data: commands });
    }
    catch (error) {
        console.error('Error getting voice command history:', error);
        res.status(500).json({ success: false, error: 'Failed to get voice command history' });
    }
});
// Voice Analytics
router.get('/analytics/:companyId/:userId', async (req, res) => {
    try {
        const { companyId, userId } = req.params;
        const { periodDays } = req.query;
        const analytics = await voiceService.getVoiceAnalytics(companyId, userId, periodDays ? parseInt(periodDays) : 30);
        res.json({ success: true, data: analytics });
    }
    catch (error) {
        console.error('Error getting voice analytics:', error);
        res.status(500).json({ success: false, error: 'Failed to get voice analytics' });
    }
});
// Voice Command Testing (for development)
router.post('/test/transcribe', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ success: false, error: 'Text is required' });
        }
        // Mock transcription for testing
        const mockTranscription = text;
        res.json({ success: true, data: { transcription: mockTranscription } });
    }
    catch (error) {
        console.error('Error testing transcription:', error);
        res.status(500).json({ success: false, error: 'Failed to test transcription' });
    }
});
router.post('/test/command', async (req, res) => {
    try {
        const { companyId, userId, transcription } = req.body;
        if (!transcription) {
            return res.status(400).json({ success: false, error: 'Transcription is required' });
        }
        // Mock command processing for testing
        const mockResult = {
            success: true,
            command: transcription,
            action: 'add_transaction',
            parameters: { amount: '50', description: 'office supplies' },
            confidence: 0.95,
            response: 'Transaction added successfully. Amount: $50, Description: office supplies',
            audioResponse: 'data:audio/wav;base64,mock_audio_data'
        };
        res.json({ success: true, data: mockResult });
    }
    catch (error) {
        console.error('Error testing command:', error);
        res.status(500).json({ success: false, error: 'Failed to test command' });
    }
});
// Voice Command Templates
router.get('/templates/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        // Return predefined voice command templates
        const templates = [
            {
                id: 'add_transaction',
                name: 'Add Transaction',
                description: 'Add a new transaction via voice',
                examples: [
                    'Add transaction for office supplies fifty dollars',
                    'Record expense for lunch twenty five dollars',
                    'New transaction for utilities one hundred dollars'
                ],
                parameters: ['amount', 'description', 'category']
            },
            {
                id: 'get_balance',
                name: 'Check Balance',
                description: 'Check account balance',
                examples: [
                    'What is the balance of checking account',
                    'Check balance for savings account',
                    'Show me the balance of credit card'
                ],
                parameters: ['account']
            },
            {
                id: 'generate_report',
                name: 'Generate Report',
                description: 'Generate financial reports',
                examples: [
                    'Generate profit and loss report for this month',
                    'Create cash flow report for last quarter',
                    'Show me the balance sheet for this year'
                ],
                parameters: ['reportType', 'period']
            },
            {
                id: 'categorize_transaction',
                name: 'Categorize Transaction',
                description: 'Categorize existing transactions',
                examples: [
                    'Categorize transaction one two three as office supplies',
                    'Mark transaction four five six as travel expense',
                    'Classify transaction seven eight nine as utilities'
                ],
                parameters: ['transactionId', 'category']
            },
            {
                id: 'reconcile_account',
                name: 'Reconcile Account',
                description: 'Reconcile bank accounts',
                examples: [
                    'Reconcile checking account',
                    'Start reconciliation for savings account',
                    'Reconcile credit card account'
                ],
                parameters: ['accountId']
            }
        ];
        res.json({ success: true, data: templates });
    }
    catch (error) {
        console.error('Error getting voice command templates:', error);
        res.status(500).json({ success: false, error: 'Failed to get voice command templates' });
    }
});
// Voice Language Support
router.get('/languages', async (req, res) => {
    try {
        const languages = [
            { code: 'en-US', name: 'English (US)', voiceType: 'male' },
            { code: 'en-GB', name: 'English (UK)', voiceType: 'female' },
            { code: 'es-ES', name: 'Spanish (Spain)', voiceType: 'male' },
            { code: 'fr-FR', name: 'French (France)', voiceType: 'female' },
            { code: 'de-DE', name: 'German (Germany)', voiceType: 'male' },
            { code: 'it-IT', name: 'Italian (Italy)', voiceType: 'female' },
            { code: 'pt-BR', name: 'Portuguese (Brazil)', voiceType: 'male' },
            { code: 'ja-JP', name: 'Japanese (Japan)', voiceType: 'female' },
            { code: 'ko-KR', name: 'Korean (Korea)', voiceType: 'male' },
            { code: 'zh-CN', name: 'Chinese (Simplified)', voiceType: 'female' }
        ];
        res.json({ success: true, data: languages });
    }
    catch (error) {
        console.error('Error getting languages:', error);
        res.status(500).json({ success: false, error: 'Failed to get languages' });
    }
});
// Voice Wake Word Management
router.post('/wake-word/:companyId/:userId/test', async (req, res) => {
    try {
        const { companyId, userId } = req.params;
        const { wakeWord } = req.body;
        if (!wakeWord) {
            return res.status(400).json({ success: false, error: 'Wake word is required' });
        }
        // Mock wake word testing
        const isDetected = wakeWord.toLowerCase().includes('uruti') || wakeWord.toLowerCase().includes('iq');
        res.json({
            success: true,
            data: {
                detected: isDetected,
                confidence: isDetected ? 0.95 : 0.1,
                message: isDetected ? 'Wake word detected successfully' : 'Wake word not detected'
            }
        });
    }
    catch (error) {
        console.error('Error testing wake word:', error);
        res.status(500).json({ success: false, error: 'Failed to test wake word' });
    }
});
// Voice Performance Metrics
router.get('/performance/:companyId/:userId', async (req, res) => {
    try {
        const { companyId, userId } = req.params;
        const { periodDays } = req.query;
        // Get analytics and calculate performance metrics
        const analytics = await voiceService.getVoiceAnalytics(companyId, userId, periodDays ? parseInt(periodDays) : 30);
        const performance = {
            accuracy: analytics.averageConfidence,
            efficiency: analytics.successfulCommands / Math.max(analytics.totalCommands, 1),
            usage: analytics.totalCommands,
            sessionTime: analytics.sessionDuration,
            errorRate: analytics.errorRate,
            topCommands: analytics.mostUsedCommands,
            languageDistribution: analytics.languageUsage
        };
        res.json({ success: true, data: performance });
    }
    catch (error) {
        console.error('Error getting voice performance:', error);
        res.status(500).json({ success: false, error: 'Failed to get voice performance' });
    }
});
// Voice Command Suggestions
router.get('/suggestions/:companyId/:userId', async (req, res) => {
    try {
        const { companyId, userId } = req.params;
        const { context } = req.query;
        // Generate contextual voice command suggestions
        const suggestions = [
            {
                context: 'transaction_entry',
                commands: [
                    'Add transaction for office supplies fifty dollars',
                    'Record expense for lunch twenty five dollars',
                    'New transaction for utilities one hundred dollars'
                ]
            },
            {
                context: 'balance_check',
                commands: [
                    'What is the balance of checking account',
                    'Check balance for savings account',
                    'Show me the balance of credit card'
                ]
            },
            {
                context: 'reporting',
                commands: [
                    'Generate profit and loss report for this month',
                    'Create cash flow report for last quarter',
                    'Show me the balance sheet for this year'
                ]
            },
            {
                context: 'general',
                commands: [
                    'Help',
                    'What can you do',
                    'Show available commands'
                ]
            }
        ];
        const filteredSuggestions = context
            ? suggestions.filter(s => s.context === context)
            : suggestions;
        res.json({ success: true, data: filteredSuggestions });
    }
    catch (error) {
        console.error('Error getting voice suggestions:', error);
        res.status(500).json({ success: false, error: 'Failed to get voice suggestions' });
    }
});
export default router;
