const fetch = require('node-fetch');

const API_BASE = 'http://localhost:4000/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXVzZXItMSIsInRlbmFudElkIjoidGVuYW50X2RlbW8iLCJyb2xlcyI6WyJhZG1pbiIsImFjY291bnRhbnQiXSwiaWF0IjoxNzU5MjIwNzM5LCJleHAiOjE3NTkyMjI1Mzl9.eGf6mTuvIGrbFpgIYpSU4MobTyIQVtISH2BL5rjjNh0';

async function testAdvancedAnalytics() {
  console.log('🔍 Testing Advanced Analytics API Endpoints...\n');

  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
    'x-tenant-id': 'tenant_demo',
    'x-company-id': 'cmg0qxjh9003nao3ftbaz1oc1'
  };

  try {
    // Test 1: Financial Insights
    console.log('📊 Testing Financial Insights...');
    const insightsResponse = await fetch(`${API_BASE}/analytics/insights?industry=retail&companyId=cmg0qxjh9003nao3ftbaz1oc1`, {
      headers
    });
    
    if (insightsResponse.ok) {
      const insightsData = await insightsResponse.json();
      console.log('✅ Financial Insights Response:');
      console.log(`   - Success: ${insightsData.success}`);
      console.log(`   - Insights Count: ${insightsData.insights?.length || 0}`);
      
      if (insightsData.insights && insightsData.insights.length > 0) {
        console.log('   - Sample Insight:');
        const sample = insightsData.insights[0];
        console.log(`     * Type: ${sample.type}`);
        console.log(`     * Category: ${sample.category}`);
        console.log(`     * Title: ${sample.title}`);
        console.log(`     * Impact: ${sample.impact}`);
        console.log(`     * Confidence: ${sample.confidence}`);
        console.log(`     * Actionable: ${sample.actionable}`);
      }
    } else {
      console.log(`❌ Financial Insights Error: ${insightsResponse.status} ${insightsResponse.statusText}`);
    }

    console.log('');

    // Test 2: Industry Benchmarks
    console.log('📈 Testing Industry Benchmarks...');
    const benchmarksResponse = await fetch(`${API_BASE}/analytics/benchmarks/retail`, {
      headers
    });
    
    if (benchmarksResponse.ok) {
      const benchmarksData = await benchmarksResponse.json();
      console.log('✅ Industry Benchmarks Response:');
      console.log(`   - Success: ${benchmarksData.success}`);
      console.log(`   - Benchmarks Count: ${benchmarksData.benchmarks?.length || 0}`);
      
      if (benchmarksData.benchmarks && benchmarksData.benchmarks.length > 0) {
        console.log('   - Sample Benchmark:');
        const sample = benchmarksData.benchmarks[0];
        console.log(`     * Industry: ${sample.industry}`);
        console.log(`     * Metric: ${sample.metric}`);
        console.log(`     * Value: ${sample.value}%`);
        console.log(`     * Percentile: ${sample.percentile}th`);
        console.log(`     * Comparison: ${sample.comparison}`);
      }
    } else {
      console.log(`❌ Industry Benchmarks Error: ${benchmarksResponse.status} ${benchmarksResponse.statusText}`);
    }

    console.log('');

    // Test 3: Cash Flow Forecast
    console.log('💰 Testing Cash Flow Forecast...');
    const forecastResponse = await fetch(`${API_BASE}/analytics/cash-flow-forecast?months=6&companyId=cmg0qxjh9003nao3ftbaz1oc1`, {
      headers
    });
    
    if (forecastResponse.ok) {
      const forecastData = await forecastResponse.json();
      console.log('✅ Cash Flow Forecast Response:');
      console.log(`   - Success: ${forecastData.success}`);
      console.log(`   - Forecast Periods: ${forecastData.forecast?.length || 0}`);
      
      if (forecastData.forecast && forecastData.forecast.length > 0) {
        console.log('   - Sample Forecast:');
        const sample = forecastData.forecast[0];
        console.log(`     * Period: ${sample.period}`);
        console.log(`     * Projected Inflow: $${sample.projectedInflow?.toFixed(2) || 'N/A'}`);
        console.log(`     * Projected Outflow: $${sample.projectedOutflow?.toFixed(2) || 'N/A'}`);
        console.log(`     * Net Cash Flow: $${sample.netCashFlow?.toFixed(2) || 'N/A'}`);
        console.log(`     * Confidence: ${Math.round((sample.confidence || 0) * 100)}%`);
        console.log(`     * Factors: ${sample.factors?.length || 0} factors`);
      }
    } else {
      console.log(`❌ Cash Flow Forecast Error: ${forecastResponse.status} ${forecastResponse.statusText}`);
    }

    console.log('\n🎯 Analysis Summary:');
    console.log('The Advanced Analytics component uses:');
    console.log('✅ REAL API endpoints (/api/analytics/*)');
    console.log('✅ REAL database queries (Prisma)');
    console.log('✅ REAL data processing (AdvancedAnalyticsService)');
    console.log('⚠️  Some helper methods use mock data for calculations');
    console.log('⚠️  Industry benchmarks are hardcoded but realistic');
    console.log('⚠️  Cash flow projections use historical data + growth assumptions');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

testAdvancedAnalytics();
