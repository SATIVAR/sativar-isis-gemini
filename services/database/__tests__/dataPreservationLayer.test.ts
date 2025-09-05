import { dataPreservationLayer } from '../dataPreservationLayer';
import { remindersRepository } from '../repositories/RemindersRepository';
import { fallbackManager } from '../fallbackManager';
import databaseService from '../index';

// Mock the database service
jest.mock('../index');
jest.mock('../repositories/RemindersRepository');
jest.mock('../fallbackManager');

describe('DataPreservationLayer', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('createReminder', () => {
    it('should create a reminder successfully when database is connected', async () => {
      // Arrange
      const mockReminderData = {
        title: 'Test Reminder',
        dueDate: '2023-12-31',
        tasks: [{ text: 'Test Task' }]
      };

      const mockCreatedReminder = {
        id: '123',
        ...mockReminderData,
        isCompleted: false,
        tasks: [{ id: '456', text: 'Test Task', isCompleted: false }]
      };

      (databaseService.isConnected as jest.Mock).mockReturnValue(true);
      (remindersRepository.createReminder as jest.Mock).mockResolvedValue(mockCreatedReminder);
      (fallbackManager.isInFallbackMode as jest.Mock).mockReturnValue(false);

      // Act
      const result = await dataPreservationLayer.createReminder(mockReminderData);

      // Assert
      expect(result).toEqual(mockCreatedReminder);
      expect(remindersRepository.createReminder).toHaveBeenCalledWith(mockReminderData);
      expect(fallbackManager.queueOperation).not.toHaveBeenCalled();
    });

    it('should queue operation when database is not connected', async () => {
      // Arrange
      const mockReminderData = {
        title: 'Test Reminder',
        dueDate: '2023-12-31',
        tasks: [{ text: 'Test Task' }]
      };

      (databaseService.isConnected as jest.Mock).mockReturnValue(false);
      (fallbackManager.isInFallbackMode as jest.Mock).mockReturnValue(true);

      // Act
      const result = await dataPreservationLayer.createReminder(mockReminderData);

      // Assert
      expect(result).toHaveProperty('id');
      expect(result.title).toBe(mockReminderData.title);
      expect(fallbackManager.queueOperation).toHaveBeenCalledWith('reminder.create', mockReminderData);
    });
  });

  describe('updateReminder', () => {
    it('should update a reminder successfully when database is connected', async () => {
      // Arrange
      const mockReminder = {
        id: '123',
        title: 'Updated Reminder',
        dueDate: '2023-12-31',
        isCompleted: false,
        tasks: [{ id: '456', text: 'Test Task', isCompleted: false }]
      };

      (databaseService.isConnected as jest.Mock).mockReturnValue(true);
      (remindersRepository.updateReminder as jest.Mock).mockResolvedValue(mockReminder);
      (fallbackManager.isInFallbackMode as jest.Mock).mockReturnValue(false);

      // Act
      const result = await dataPreservationLayer.updateReminder(mockReminder);

      // Assert
      expect(result).toEqual(mockReminder);
      expect(remindersRepository.updateReminder).toHaveBeenCalledWith(mockReminder);
      expect(fallbackManager.queueOperation).not.toHaveBeenCalled();
    });

    it('should queue operation when database is not connected', async () => {
      // Arrange
      const mockReminder = {
        id: '123',
        title: 'Updated Reminder',
        dueDate: '2023-12-31',
        isCompleted: false,
        tasks: [{ id: '456', text: 'Test Task', isCompleted: false }]
      };

      (databaseService.isConnected as jest.Mock).mockReturnValue(false);
      (fallbackManager.isInFallbackMode as jest.Mock).mockReturnValue(true);

      // Act
      const result = await dataPreservationLayer.updateReminder(mockReminder);

      // Assert
      expect(result).toEqual(mockReminder);
      expect(fallbackManager.queueOperation).toHaveBeenCalledWith('reminder.update', mockReminder);
    });
  });

  describe('deleteReminder', () => {
    it('should delete a reminder successfully when database is connected', async () => {
      // Arrange
      const reminderId = '123';
      (databaseService.isConnected as jest.Mock).mockReturnValue(true);
      (remindersRepository.deleteReminder as jest.Mock).mockResolvedValue(true);
      (fallbackManager.isInFallbackMode as jest.Mock).mockReturnValue(false);

      // Act
      await dataPreservationLayer.deleteReminder(reminderId);

      // Assert
      expect(remindersRepository.deleteReminder).toHaveBeenCalledWith(reminderId);
      expect(fallbackManager.queueOperation).not.toHaveBeenCalled();
    });

    it('should queue operation when database is not connected', async () => {
      // Arrange
      const reminderId = '123';
      (databaseService.isConnected as jest.Mock).mockReturnValue(false);
      (fallbackManager.isInFallbackMode as jest.Mock).mockReturnValue(true);

      // Act
      await dataPreservationLayer.deleteReminder(reminderId);

      // Assert
      expect(fallbackManager.queueOperation).toHaveBeenCalledWith('reminder.delete', { id: reminderId });
    });
  });

  describe('getAllReminders', () => {
    it('should get all reminders from database when connected', async () => {
      // Arrange
      const mockReminders = [
        {
          id: '123',
          title: 'Test Reminder',
          dueDate: '2023-12-31',
          isCompleted: false,
          tasks: []
        }
      ];

      (databaseService.isConnected as jest.Mock).mockReturnValue(true);
      (remindersRepository.getAllReminders as jest.Mock).mockResolvedValue(mockReminders);
      (fallbackManager.isInFallbackMode as jest.Mock).mockReturnValue(false);

      // Act
      const result = await dataPreservationLayer.getAllReminders();

      // Assert
      expect(result).toEqual(mockReminders);
      expect(remindersRepository.getAllReminders).toHaveBeenCalled();
    });

    it('should get reminders from cache when database is not connected', async () => {
      // Arrange
      const mockCachedReminders = [
        {
          id: '123',
          title: 'Cached Reminder',
          dueDate: '2023-12-31',
          isCompleted: false,
          tasks: []
        }
      ];

      (databaseService.isConnected as jest.Mock).mockReturnValue(false);
      (fallbackManager.isInFallbackMode as jest.Mock).mockReturnValue(true);
      // Mock localStorage
      Storage.prototype.getItem = jest.fn(() => JSON.stringify(mockCachedReminders));

      // Act
      const result = await dataPreservationLayer.getAllReminders();

      // Assert
      expect(result).toEqual(mockCachedReminders);
    });
  });

  describe('sync', () => {
    it('should call sync service to synchronize data', async () => {
      // Arrange
      const mockSyncResult = {
        success: true,
        message: 'Sync completed'
      };

      // Mock the syncService (we'll need to import it)
      const syncService = require('../syncService');
      syncService.syncWithDatabase = jest.fn().mockResolvedValue(mockSyncResult);

      // Act
      const result = await dataPreservationLayer.sync();

      // Assert
      expect(syncService.syncWithDatabase).toHaveBeenCalled();
      expect(result).toEqual(mockSyncResult);
    });
  });
});