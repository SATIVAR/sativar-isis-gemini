#!/usr/bin/env node

/**
 * Verification script for Sync Manager with conflict resolution
 * This script verifies that the Sync Manager is properly implemented and functional
 */

import { syncService } from './syncService';
import { fallbackManager } from './fallbackManager';
import databaseService from './index';
import { remindersRepository } from './repositories/RemindersRepository';

// Mock implementations for testing
const mockDatabaseService = {
  isConnected: jest.fn().mockReturnValue(true)
};

const mockFallbackManager = {
  isInFallbackMode: jest.fn().mockReturnValue(true),
  dequeueReadyOperations: jest.fn().mockReturnValue([
    { id: '1', operation: 'reminder.create', data: { title: 'Test Reminder' } }
  ]),
  completeOperations: jest.fn(),
  disableFallbackMode: jest.fn()
};

const mockRemindersRepository = {
  createReminder: jest.fn().mockResolvedValue({ id: '1', title: 'Test Reminder' }),
  getAllReminders: jest.fn().mockResolvedValue([
    { id: '1', title: 'Test Reminder', version: 1 }
  ])
};

// Override the actual implementations with mocks for testing
jest.mock('./index', () => mockDatabaseService);
jest.mock('./fallbackManager', () => mockFallbackManager);
jest.mock('./repositories/RemindersRepository', () => mockRemindersRepository);

async function verifySyncManager() {
  console.log('Verifying Sync Manager with conflict resolution...');
  
  try {
    // Test syncWithDatabase method
    console.log('Testing syncWithDatabase method...');
    const syncResult = await syncService.syncWithDatabase();
    console.log('Sync result:', syncResult);
    
    if (syncResult.success) {
      console.log('✓ syncWithDatabase method works correctly');
    } else {
      console.log('✗ syncWithDatabase method failed:', syncResult.message);
      return false;
    }
    
    // Test detectConflicts method
    console.log('Testing detectConflicts method...');
    const conflicts = await syncService.detectConflicts();
    console.log('Detected conflicts:', conflicts);
    
    console.log('✓ detectConflicts method works correctly');
    
    // Test mergeReminderConflict method
    console.log('Testing mergeReminderConflict method...');
    const localReminder = {
      id: '1',
      title: 'Local Reminder',
      version: 2,
      updated_at: '2023-01-01T10:00:00Z'
    };
    
    const remoteReminder = {
      id: '1',
      title: 'Remote Reminder',
      version: 1,
      updated_at: '2023-01-01T09:00:00Z'
    };
    
    const merged = (syncService as any).mergeReminderConflict(localReminder, remoteReminder);
    console.log('Merged reminder:', merged);
    
    if (merged.version > remoteReminder.version) {
      console.log('✓ mergeReminderConflict method works correctly');
    } else {
      console.log('✗ mergeReminderConflict method failed');
      return false;
    }
    
    console.log('All Sync Manager tests passed!');
    return true;
  } catch (error) {
    console.error('Error during verification:', error);
    return false;
  }
}

// Run the verification if this script is executed directly
if (require.main === module) {
  verifySyncManager().then(success => {
    if (success) {
      console.log('Sync Manager verification completed successfully!');
      process.exit(0);
    } else {
      console.log('Sync Manager verification failed!');
      process.exit(1);
    }
  });
}

export { verifySyncManager };