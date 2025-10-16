import { UrutiIQClient, createUrutiIQClient } from '../src/urutiq-client';

// Example 1: Basic setup with API key
const client = new UrutiIQClient({
  baseUrl: 'https://api.urutiq.com',
  apiKey: 'uruti_your_api_key_here',
  tenantId: 'your_tenant_id',
  companyId: 'your_company_id'
});

// Example 2: Using factory function
const client2 = createUrutiIQClient({
  baseUrl: 'https://api.urutiq.com',
  apiKey: 'uruti_your_api_key_here',
  tenantId: 'your_tenant_id',
  companyId: 'your_company_id'
});

// Example 3: Using OAuth 2.1 access token
const oauthClient = new UrutiIQClient({
  baseUrl: 'https://api.urutiq.com',
  accessToken: 'your_oauth_access_token',
  tenantId: 'your_tenant_id',
  companyId: 'your_company_id'
});

async function basicUsageExamples() {
  try {
    // Health check
    const health = await client.healthCheck();
    console.log('API Health:', health);

    // Get trial balance
    const trialBalance = await client.getTrialBalance({
      startDate: '2024-01-01',
      endDate: '2024-01-31'
    });
    console.log('Trial Balance:', trialBalance);

    // Get general ledger
    const generalLedger = await client.getGeneralLedger({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      page: 1,
      limit: 50
    });
    console.log('General Ledger:', generalLedger);

    // Get balance sheet
    const balanceSheet = await client.getBalanceSheet({
      asOfDate: '2024-01-31'
    });
    console.log('Balance Sheet:', balanceSheet);

    // Get income statement
    const incomeStatement = await client.getIncomeStatement({
      startDate: '2024-01-01',
      endDate: '2024-01-31'
    });
    console.log('Income Statement:', incomeStatement);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Event handling examples
function eventHandlingExamples() {
  // Listen to request events
  client.onRequestStart((data) => {
    console.log('Request started:', data.requestId, data.options.endpoint);
  });

  client.onRequestSuccess((data) => {
    console.log('Request successful:', data.requestId, data.duration + 'ms');
  });

  client.onRequestError((data) => {
    console.error('Request failed:', data.requestId, data.error.message);
  });
}

// API Key management examples
async function apiKeyManagementExamples() {
  try {
    // Create API key
    const apiKey = await client.createApiKey({
      companyId: 'your_company_id',
      name: 'My Integration',
      permissions: ['read:accounts', 'read:reports'],
      expiresAt: '2024-12-31T23:59:59Z'
    });
    console.log('Created API key:', apiKey);

    // List API keys
    const apiKeys = await client.getApiKeys({
      companyId: 'your_company_id',
      page: 1,
      limit: 10
    });
    console.log('API Keys:', apiKeys);

    // Update API key
    const updatedKey = await client.updateApiKey(apiKey.id, {
      name: 'Updated Integration Name',
      isActive: true
    });
    console.log('Updated API key:', updatedKey);

    // Delete API key
    await client.deleteApiKey(apiKey.id);
    console.log('API key deleted');

  } catch (error) {
    console.error('API Key management error:', error);
  }
}

// OAuth 2.1 management examples
async function oauthManagementExamples() {
  try {
    // Create OAuth client
    const oauthClient = await client.createOAuthClient({
      name: 'My OAuth App',
      description: 'My application for OAuth integration',
      redirectUris: ['https://myapp.com/callback'],
      scopes: ['read:accounts', 'write:transactions']
    });
    console.log('Created OAuth client:', oauthClient);

    // List OAuth clients
    const clients = await client.getOAuthClients();
    console.log('OAuth clients:', clients);

    // Get available scopes
    const scopes = await client.getOAuthScopes();
    console.log('Available scopes:', scopes);

  } catch (error) {
    console.error('OAuth management error:', error);
  }
}

// Performance analytics examples
async function performanceAnalyticsExamples() {
  try {
    // Get API usage analytics
    const usage = await client.getApiUsageAnalytics({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      companyId: 'your_company_id'
    });
    console.log('API Usage Analytics:', usage);

    // Get performance metrics
    const metrics = await client.getPerformanceMetrics({
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      companyId: 'your_company_id'
    });
    console.log('Performance Metrics:', metrics);

    // Record custom metric
    await client.recordCustomMetric({
      metricName: 'user_registrations',
      metricValue: 150,
      metricUnit: 'count',
      tags: { source: 'website', campaign: 'q1_2024' }
    });
    console.log('Custom metric recorded');

    // Get custom metrics
    const customMetrics = await client.getCustomMetrics('user_registrations', {
      startDate: '2024-01-01',
      endDate: '2024-01-31'
    });
    console.log('Custom metrics:', customMetrics);

  } catch (error) {
    console.error('Performance analytics error:', error);
  }
}

// Error handling examples
async function errorHandlingExamples() {
  try {
    // This will throw an error
    await client.getTrialBalance({
      startDate: 'invalid-date',
      endDate: '2024-01-31'
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      
      if ('status' in error) {
        console.error('HTTP status:', (error as any).status);
        console.error('Error code:', (error as any).code);
      }
    }
  }
}

// Configuration examples
function configurationExamples() {
  // Update configuration
  client.updateConfig({
    timeout: 60000, // 60 seconds
    retries: 5
  });

  // Get current configuration
  const config = client.getConfig();
  console.log('Current config:', config);
}

// Run examples
async function runAllExamples() {
  console.log('Running basic usage examples...');
  await basicUsageExamples();

  console.log('\nSetting up event handling...');
  eventHandlingExamples();

  console.log('\nRunning API key management examples...');
  await apiKeyManagementExamples();

  console.log('\nRunning OAuth management examples...');
  await oauthManagementExamples();

  console.log('\nRunning performance analytics examples...');
  await performanceAnalyticsExamples();

  console.log('\nRunning error handling examples...');
  await errorHandlingExamples();

  console.log('\nRunning configuration examples...');
  configurationExamples();
}

// Export for use in other files
export {
  basicUsageExamples,
  eventHandlingExamples,
  apiKeyManagementExamples,
  oauthManagementExamples,
  performanceAnalyticsExamples,
  errorHandlingExamples,
  configurationExamples,
  runAllExamples
};
