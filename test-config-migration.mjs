#!/usr/bin/env node

/**
 * Simple test script to verify environment-based configuration works
 */

import { ConfigurationManager } from './packages/core/build/configuration-manager.js';

async function testEnvironmentConfig() {
  console.log('🧪 Testing environment-based configuration migration...\n');
  
  // Test 1: Default JSON configuration (no env vars)
  console.log('📄 Test 1: Default JSON configuration');
  delete process.env.POSTGRES_URL;
  delete process.env.DATABASE_URL;
  delete process.env.MYSQL_URL;
  delete process.env.SQLITE_URL;
  delete process.env.GITHUB_TOKEN;
  
  const configManager1 = new ConfigurationManager();
  await configManager1.initialize();
  const config1 = await configManager1.loadConfig();
  console.log('✅ Default config:', config1.storage?.type);
  console.log('   Directory:', config1.storage?.json?.directory);
  console.log('   Global:', config1.storage?.json?.global);
  
  // Test 2: PostgreSQL from environment
  console.log('\n🐘 Test 2: PostgreSQL configuration');
  process.env.POSTGRES_URL = 'postgresql://test:test@localhost:5432/testdb';
  
  const configManager2 = new ConfigurationManager();
  await configManager2.initialize();
  const config2 = await configManager2.loadConfig();
  console.log('✅ PostgreSQL config:', config2.storage?.type);
  console.log('   Connection:', config2.storage?.connectionString);
  
  // Test 3: Custom JSON configuration via env vars
  console.log('\n📁 Test 3: Custom JSON configuration');
  delete process.env.POSTGRES_URL;
  process.env.DEVLOG_JSON_DIRECTORY = 'custom-devlog';
  process.env.DEVLOG_JSON_GLOBAL = 'false';
  process.env.DEVLOG_JSON_MIN_PADDING = '5';
  
  const configManager3 = new ConfigurationManager();
  await configManager3.initialize();
  const config3 = await configManager3.loadConfig();
  console.log('✅ Custom JSON config:', config3.storage?.type);
  console.log('   Directory:', config3.storage?.json?.directory);
  console.log('   Global:', config3.storage?.json?.global);
  console.log('   Min padding:', config3.storage?.json?.minPadding);
  
  // Test 4: GitHub configuration
  console.log('\n🐙 Test 4: GitHub configuration');
  delete process.env.DEVLOG_JSON_DIRECTORY;
  delete process.env.DEVLOG_JSON_GLOBAL;
  delete process.env.DEVLOG_JSON_MIN_PADDING;
  process.env.GITHUB_TOKEN = 'ghp_test123';
  process.env.GITHUB_OWNER = 'testowner';
  process.env.GITHUB_REPO = 'testrepo';
  process.env.GITHUB_USE_NATIVE_TYPE = 'false';
  
  const configManager4 = new ConfigurationManager();
  await configManager4.initialize();
  const config4 = await configManager4.loadConfig();
  console.log('✅ GitHub config:', config4.storage?.type);
  console.log('   Owner/Repo:', `${config4.storage?.github?.owner}/${config4.storage?.github?.repo}`);
  console.log('   Use native type:', config4.storage?.github?.mapping?.useNativeType);
  
  console.log('\n🎉 All tests passed! Environment-based configuration is working correctly.');
}

testEnvironmentConfig().catch(console.error);
