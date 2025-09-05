import { syncService } from '../syncService';
import databaseService from '../index';
import { fallbackManager } from '../fallbackManager';
import { remindersRepository } from '../repositories/RemindersRepository';

// Mock the dependencies
jest.mock('../index');
jest.mock('../fallbackManager');
jest.mock('../repositories/RemindersRepository');

describe('SyncService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('syncWithDatabase', () => {
    it('should return error when already syncing', async () => {
      // Arrange
      // Simulate that sync is already in progress by directly setting the flag
      (syncService as any).isSyncing = true;

      // Act
      const result = await syncService.syncWithDatabase();

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Synchronization already in progress');
    });

    it('should return error when database is not connected', async () => {
      // Arrange
      (databaseService.isConnected as jest.Mock).mockReturnValue(false);

      // Act
      const result = await syncService.syncWithDatabase();

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Database is not connected');
    });

    it('should return error when not in fallback mode', async () => {
      // Arrange
      (databaseService.isConnected as jest.Mock).mockReturnValue(true);
      (fallbackManager.isInFallbackMode as jest.Mock).mockReturnValue(false);

      // Act
      const result = await syncService.syncWithDatabase();

      // Assert
      expect(result.success).toBe(false);
      expect(result.message).toBe('Not in fallback mode');
    });

    it('should successfully sync operations when conditions are met', async () => {
      // Arrange
      (databaseService.isConnected as jest.Mock).mockReturnValue(true);
      (fallbackManager.isInFallbackMode as jest.Mock).mockReturnValue(true);
      
      const mockOperations = [
        { id: '1', operation: 'reminder.create', data: { title: 'Test Reminder' } }
      ];
      
      (fallbackManager.dequeueReadyOperations as jest.Mock).mockReturnValue(mockOperations);
      (remindersRepository.createReminder as jest.Mock).mockResolvedValue({});
      (fallbackManager.completeOperations as jest.Mock).mockReturnValue();

      // Act
      const result = await syncService.syncWithDatabase();

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('Synchronization completed');
      expect(fallbackManager.dequeueReadyOperations).toHaveBeenCalledWith(200);
      expect(remindersRepository.createReminder).toHaveBeenCalledWith({ title: 'Test Reminder' });
      expect(fallbackManager.completeOperations).toHaveBeenCalledWith(['1']);
    });

    it('should handle sync operation failures', async () => {
      // Arrange
      (databaseService.isConnected as jest.Mock).mockReturnValue(true);
      (fallbackManager.isInFallbackMode as jest.Mock).mockReturnValue(true);
      
      const mockOperations = [
        { id: '1', operation: 'reminder.create', data: { title: 'Test Reminder' } }
      ];
      
      (fallbackManager.dequeueReadyOperations as jest.Mock).mockReturnValue(mockOperations);
      (remindersRepository.createReminder as jest.Mock).mockRejectedValue(new Error('Database error'));
      (fallbackManager.markOperationFailed as jest.Mock).mockReturnValue();

      // Act
      const result = await syncService.syncWithDatabase();

      // Assert
      expect(result.success).toBe(true); // Sync process completed, but with conflicts
      expect(result.conflicts).toHaveLength(1);
      expect(fallbackManager.markOperationFailed).toHaveBeenCalledWith('1', expect.any(Error));
    });
  });

  describe('detectConflicts', () => {
    it('should detect conflicts between localStorage and database reminders', async () => {
      // Arrange
      const localStorageReminders = [
        { id: '1', title: 'Local Reminder', version: 1 }
      ];
      
      const dbReminders = [
        { id: '1', title: 'Database Reminder', version: 2 }
      ];
      
      (fallbackManager.getStoredReminders as jest.Mock).mockReturnValue(localStorageReminders);
      (remindersRepository.getAllReminders as jest.Mock).mockResolvedValue(dbReminders);

      // Act
      const conflicts = await syncService.detectConflicts();

      // Assert
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('reminder_version_conflict');
      expect(conflicts[0].id).toBe('1');
    });

    it('should not detect conflicts when versions match', async () => {
      // Arrange
      const localStorageReminders = [
        { id: '1', title: 'Local Reminder', version: 1 }
      ];
      
      const dbReminders = [
        { id: '1', title: 'Database Reminder', version: 1 }
      ];
      
      (fallbackManager.getStoredReminders as jest.Mock).mockReturnValue(localStorageReminders);
      (remindersRepository.getAllReminders as jest.Mock).mockResolvedValue(dbReminders);

      // Act
      const conflicts = await syncService.detectConflicts();

      // Assert
      expect(conflicts).toHaveLength(0);
    });
  });
});