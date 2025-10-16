#!/usr/bin/env tsx

/**
 * Backend Test Runner
 * 
 * This script runs comprehensive backend tests component by component
 * and provides detailed reporting on test coverage and results.
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

interface TestResult {
  component: string
  passed: number
  failed: number
  total: number
  coverage?: number
  duration: number
  errors: string[]
}

interface TestSuite {
  name: string
  path: string
  description: string
  priority: 'high' | 'medium' | 'low'
}

class BackendTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'Auth Service',
      path: '__tests__/services/auth-service.test.ts',
      description: 'Authentication and authorization service tests',
      priority: 'high'
    },
    {
      name: 'Accounting Service',
      path: '__tests__/services/accounting-service.test.ts',
      description: 'Core accounting functionality tests',
      priority: 'high'
    },
    {
      name: 'AI Service',
      path: '__tests__/services/ai-service.test.ts',
      description: 'AI-powered features and machine learning tests',
      priority: 'high'
    },
    {
      name: 'Banking Routes',
      path: '__tests__/routes/banking-routes.test.ts',
      description: 'Banking integration API endpoint tests',
      priority: 'high'
    },
    {
      name: 'Auth API',
      path: '__tests__/api/auth.test.ts',
      description: 'Authentication API endpoint tests',
      priority: 'high'
    },
    {
      name: 'Accounting API',
      path: '__tests__/api/accounting.test.ts',
      description: 'Accounting API endpoint tests',
      priority: 'high'
    }
  ]

  private results: TestResult[] = []

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Backend Component Testing\n')
    console.log('=' .repeat(60))
    
    for (const suite of this.testSuites) {
      await this.runTestSuite(suite)
    }
    
    this.generateReport()
  }

  async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`\n📋 Testing: ${suite.name}`)
    console.log(`📝 Description: ${suite.description}`)
    console.log(`⚡ Priority: ${suite.priority.toUpperCase()}`)
    console.log(`📁 Path: ${suite.path}`)
    console.log('-'.repeat(40))

    const startTime = Date.now()
    
    try {
      // Check if test file exists
      const testPath = join(process.cwd(), suite.path)
      const testExists = require('fs').existsSync(testPath)
      
      if (!testExists) {
        console.log(`⚠️  Test file not found: ${suite.path}`)
        this.results.push({
          component: suite.name,
          passed: 0,
          failed: 1,
          total: 1,
          duration: Date.now() - startTime,
          errors: [`Test file not found: ${suite.path}`]
        })
        return
      }

      // Run the specific test suite
      const command = `npx jest ${suite.path} --verbose --coverage --testTimeout=10000`
      console.log(`🔧 Running: ${command}`)
      
      const output = execSync(command, { 
        encoding: 'utf8',
        cwd: process.cwd(),
        stdio: 'pipe'
      })
      
      const duration = Date.now() - startTime
      
      // Parse Jest output to extract test results
      const result = this.parseJestOutput(output, suite.name, duration)
      this.results.push(result)
      
      console.log(`✅ Tests completed in ${duration}ms`)
      console.log(`📊 Results: ${result.passed} passed, ${result.failed} failed, ${result.total} total`)
      
      if (result.errors.length > 0) {
        console.log(`❌ Errors:`)
        result.errors.forEach(error => console.log(`   - ${error}`))
      }
      
    } catch (error) {
      const duration = Date.now() - startTime
      console.log(`❌ Test suite failed: ${error.message}`)
      
      this.results.push({
        component: suite.name,
        passed: 0,
        failed: 1,
        total: 1,
        duration,
        errors: [error.message]
      })
    }
  }

  private parseJestOutput(output: string, component: string, duration: number): TestResult {
    const lines = output.split('\n')
    let passed = 0
    let failed = 0
    let total = 0
    let coverage = 0
    const errors: string[] = []

    // Parse test results
    for (const line of lines) {
      if (line.includes('Tests:')) {
        const match = line.match(/(\d+) passed|(\d+) failed|(\d+) total/)
        if (match) {
          if (match[1]) passed = parseInt(match[1])
          if (match[2]) failed = parseInt(match[2])
          if (match[3]) total = parseInt(match[3])
        }
      }
      
      if (line.includes('All files')) {
        const coverageMatch = line.match(/(\d+(?:\.\d+)?)%/)
        if (coverageMatch) {
          coverage = parseFloat(coverageMatch[1])
        }
      }
      
      if (line.includes('FAIL') || line.includes('Error:')) {
        errors.push(line.trim())
      }
    }

    return {
      component,
      passed,
      failed,
      total,
      coverage,
      duration,
      errors
    }
  }

  private generateReport(): void {
    console.log('\n' + '='.repeat(60))
    console.log('📊 BACKEND TEST REPORT')
    console.log('='.repeat(60))

    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0)
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0)
    const totalTests = this.results.reduce((sum, r) => sum + r.total, 0)
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0)
    const avgCoverage = this.results
      .filter(r => r.coverage !== undefined)
      .reduce((sum, r) => sum + (r.coverage || 0), 0) / 
      this.results.filter(r => r.coverage !== undefined).length

    console.log(`\n📈 SUMMARY:`)
    console.log(`   Total Tests: ${totalTests}`)
    console.log(`   ✅ Passed: ${totalPassed}`)
    console.log(`   ❌ Failed: ${totalFailed}`)
    console.log(`   📊 Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`)
    console.log(`   ⏱️  Total Duration: ${totalDuration}ms`)
    console.log(`   📋 Coverage: ${avgCoverage.toFixed(1)}%`)

    console.log(`\n📋 COMPONENT BREAKDOWN:`)
    this.results.forEach(result => {
      const status = result.failed === 0 ? '✅' : '❌'
      const coverage = result.coverage ? ` (${result.coverage.toFixed(1)}%)` : ''
      console.log(`   ${status} ${result.component}: ${result.passed}/${result.total}${coverage}`)
      
      if (result.errors.length > 0) {
        result.errors.forEach(error => {
          console.log(`      ⚠️  ${error}`)
        })
      }
    })

    // Priority-based recommendations
    console.log(`\n🎯 RECOMMENDATIONS:`)
    const highPriorityResults = this.results.filter(r => 
      this.testSuites.find(s => s.name === r.component)?.priority === 'high'
    )
    
    const highPriorityFailed = highPriorityResults.filter(r => r.failed > 0)
    
    if (highPriorityFailed.length === 0) {
      console.log(`   ✅ All high-priority components are passing!`)
    } else {
      console.log(`   🔥 High-priority components need attention:`)
      highPriorityFailed.forEach(result => {
        console.log(`      - ${result.component}: ${result.failed} failures`)
      })
    }

    // Coverage recommendations
    const lowCoverage = this.results.filter(r => r.coverage && r.coverage < 80)
    if (lowCoverage.length > 0) {
      console.log(`   📊 Components with low coverage (< 80%):`)
      lowCoverage.forEach(result => {
        console.log(`      - ${result.component}: ${result.coverage?.toFixed(1)}%`)
      })
    }

    // Generate JSON report
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests,
        passed: totalPassed,
        failed: totalFailed,
        successRate: (totalPassed / totalTests) * 100,
        totalDuration,
        averageCoverage: avgCoverage
      },
      components: this.results,
      recommendations: {
        highPriorityIssues: highPriorityFailed.length,
        lowCoverageComponents: lowCoverage.length,
        overallHealth: totalFailed === 0 ? 'excellent' : totalFailed < totalTests * 0.1 ? 'good' : 'needs_attention'
      }
    }

    const reportPath = join(process.cwd(), 'test-report.json')
    writeFileSync(reportPath, JSON.stringify(reportData, null, 2))
    console.log(`\n📄 Detailed report saved to: ${reportPath}`)

    // Exit with appropriate code
    if (totalFailed > 0) {
      console.log(`\n❌ Some tests failed. Please review the results above.`)
      process.exit(1)
    } else {
      console.log(`\n🎉 All tests passed! Backend is ready for deployment.`)
      process.exit(0)
    }
  }
}

// Run the test runner
async function main() {
  const runner = new BackendTestRunner()
  await runner.runAllTests()
}

// Run the test runner if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { BackendTestRunner }
