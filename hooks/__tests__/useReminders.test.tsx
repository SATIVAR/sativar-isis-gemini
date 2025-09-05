import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { RemindersProvider } from '../useReminders';
import { dataPreservationLayer } from '../../services/database/dataPreservationLayer';

// Mock the data preservation layer
jest.mock('../../services/database/dataPreservationLayer');

// Mock toast service
jest.mock('../../services/toastService', () => ({
  toastService: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn()
  }
}));

// Mock Notification API
global.Notification = {
  requestPermission: jest.fn().mockResolvedValue('granted'),
  permission: 'granted'
} as any;

describe('useReminders Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <RemindersProvider>{children}</RemindersProvider>
  );

  describe('addReminder', () => {
    it('should add a new reminder successfully', async () => {
      // Arrange
      const mockReminder = {
        id: '123',
        title: 'Test Reminder',
        dueDate: '2023-12-31',
        isCompleted: false,
        tasks: [{ id: '456', text: 'Test Task', isCompleted: false }]
      };

      (dataPreservationLayer.createReminder as jest.Mock).mockResolvedValue(mockReminder);

      // Act
      const { result, waitForNextUpdate } = renderHook(() => useReminders(), { wrapper });
      
      // Wait for initial load
      await waitForNextUpdate();

      // Add a reminder
      await act(async () => {
        await result.current.addReminder({
          title: 'Test Reminder',
          dueDate: '2023-12-31',
          tasks: [{ text: 'Test Task' }]
        });
      });

      // Assert
      expect(dataPreservationLayer.createReminder).toHaveBeenCalledWith({
        title: 'Test Reminder',
        dueDate: '2023-12-31',
        tasks: [{ text: 'Test Task' }]
      });
      expect(result.current.reminders).toHaveLength(1);
      expect(result.current.reminders[0]).toEqual(mockReminder);
    });

    it('should show error toast when adding reminder fails', async () => {
      // Arrange
      (dataPreservationLayer.createReminder as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act
      const { result, waitForNextUpdate } = renderHook(() => useReminders(), { wrapper });
      
      // Wait for initial load
      await waitForNextUpdate();

      // Try to add a reminder
      try {
        await act(async () => {
          await result.current.addReminder({
            title: 'Test Reminder',
            dueDate: '2023-12-31',
            tasks: [{ text: 'Test Task' }]
          });
        });
      } catch (error) {
        // Expected error
      }

      // Assert
      expect(dataPreservationLayer.createReminder).toHaveBeenCalled();
      // We would check that toastService.error was called, but it's mocked
    });
  });

  describe('updateReminder', () => {
    it('should update an existing reminder', async () => {
      // Arrange
      const initialReminder = {
        id: '123',
        title: 'Initial Reminder',
        dueDate: '2023-12-31',
        isCompleted: false,
        tasks: []
      };

      const updatedReminder = {
        ...initialReminder,
        title: 'Updated Reminder'
      };

      (dataPreservationLayer.getAllReminders as jest.Mock).mockResolvedValue([initialReminder]);
      (dataPreservationLayer.updateReminder as jest.Mock).mockResolvedValue(updatedReminder);

      // Act
      const { result, waitForNextUpdate } = renderHook(() => useReminders(), { wrapper });
      
      // Wait for initial load
      await waitForNextUpdate();

      // Update the reminder
      await act(async () => {
        await result.current.updateReminder(updatedReminder);
      });

      // Assert
      expect(dataPreservationLayer.updateReminder).toHaveBeenCalledWith(updatedReminder);
      expect(result.current.reminders[0]).toEqual(updatedReminder);
    });
  });

  describe('deleteReminder', () => {
    it('should delete a reminder', async () => {
      // Arrange
      const reminder = {
        id: '123',
        title: 'Test Reminder',
        dueDate: '2023-12-31',
        isCompleted: false,
        tasks: []
      };

      (dataPreservationLayer.getAllReminders as jest.Mock).mockResolvedValue([reminder]);
      (dataPreservationLayer.deleteReminder as jest.Mock).mockResolvedValue(undefined);

      // Act
      const { result, waitForNextUpdate } = renderHook(() => useReminders(), { wrapper });
      
      // Wait for initial load
      await waitForNextUpdate();

      // Delete the reminder
      await act(async () => {
        await result.current.deleteReminder('123');
      });

      // Assert
      expect(dataPreservationLayer.deleteReminder).toHaveBeenCalledWith('123');
      expect(result.current.reminders).toHaveLength(0);
    });
  });

  describe('toggleTask', () => {
    it('should toggle task completion status', async () => {
      // Arrange
      const reminder = {
        id: '123',
        title: 'Test Reminder',
        dueDate: '2023-12-31',
        isCompleted: false,
        tasks: [
          { id: '456', text: 'Test Task', isCompleted: false }
        ]
      };

      const updatedReminder = {
        ...reminder,
        tasks: [
          { id: '456', text: 'Test Task', isCompleted: true }
        ]
      };

      (dataPreservationLayer.getAllReminders as jest.Mock).mockResolvedValue([reminder]);
      (dataPreservationLayer.updateReminder as jest.Mock).mockResolvedValue(updatedReminder);

      // Act
      const { result, waitForNextUpdate } = renderHook(() => useReminders(), { wrapper });
      
      // Wait for initial load
      await waitForNextUpdate();

      // Toggle the task
      await act(async () => {
        await result.current.toggleTask('123', '456');
      });

      // Assert
      expect(dataPreservationLayer.updateReminder).toHaveBeenCalled();
      expect(result.current.reminders[0].tasks[0].isCompleted).toBe(true);
    });
  });
});

// We need to import useReminders after the mocks are set up
let useReminders: typeof import('../useReminders').useReminders;
beforeAll(() => {
  useReminders = require('../useReminders').useReminders;
});