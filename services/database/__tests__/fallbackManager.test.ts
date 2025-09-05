import { fallbackManager } from '../fallbackManager';

describe('FallbackManager', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset the singleton instance
    (fallbackManager as any).instance = null;
  });

  afterEach(() => {
    // Clear localStorage after each test
    localStorage.clear();
  });

  describe('enableFallbackMode', () => {
    it('should enable fallback mode with a reason', async () => {
      // Act
      await fallbackManager.enableFallbackMode('test reason');

      // Assert
      expect(fallbackManager.isInFallbackMode()).toBe(true);
      expect(fallbackManager.getFallbackReason()).toBe('test reason');
    });

    it('should not enable fallback mode if already enabled', async () => {
      // Arrange
      await fallbackManager.enableFallbackMode('initial reason');

      // Act
      await fallbackManager.enableFallbackMode('new reason');

      // Assert
      expect(fallbackManager.isInFallbackMode()).toBe(true);
      expect(fallbackManager.getFallbackReason()).toBe('initial reason');
    });
  });

  describe('disableFallbackMode', () => {
    it('should disable fallback mode', async () => {
      // Arrange
      await fallbackManager.enableFallbackMode('test reason');

      // Act
      await fallbackManager.disableFallbackMode();

      // Assert
      expect(fallbackManager.isInFallbackMode()).toBe(false);
      expect(fallbackManager.getFallbackReason()).toBeNull();
    });

    it('should not disable fallback mode if not enabled', async () => {
      // Act
      await fallbackManager.disableFallbackMode();

      // Assert
      expect(fallbackManager.isInFallbackMode()).toBe(false);
    });
  });

  describe('queueOperation', () => {
    it('should queue an operation when in fallback mode', async () => {
      // Arrange
      await fallbackManager.enableFallbackMode('test reason');
      const operation = 'reminder.create';
      const data = { title: 'Test Reminder' };

      // Act
      fallbackManager.queueOperation(operation, data);

      // Assert
      const queue = fallbackManager.getOperationQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].operation).toBe(operation);
      expect(queue[0].data).toEqual(data);
    });

    it('should not queue an operation when not in fallback mode', () => {
      // Arrange
      const operation = 'reminder.create';
      const data = { title: 'Test Reminder' };

      // Act
      fallbackManager.queueOperation(operation, data);

      // Assert
      const queue = fallbackManager.getOperationQueue();
      expect(queue).toHaveLength(0);
    });
  });

  describe('getOperationQueue', () => {
    it('should return the operation queue', async () => {
      // Arrange
      await fallbackManager.enableFallbackMode('test reason');
      fallbackManager.queueOperation('reminder.create', { title: 'Test 1' });
      fallbackManager.queueOperation('reminder.update', { title: 'Test 2' });

      // Act
      const queue = fallbackManager.getOperationQueue();

      // Assert
      expect(queue).toHaveLength(2);
      expect(queue[0].operation).toBe('reminder.create');
      expect(queue[1].operation).toBe('reminder.update');
    });
  });

  describe('clearOperationQueue', () => {
    it('should clear the operation queue', async () => {
      // Arrange
      await fallbackManager.enableFallbackMode('test reason');
      fallbackManager.queueOperation('reminder.create', { title: 'Test 1' });
      fallbackManager.queueOperation('reminder.update', { title: 'Test 2' });

      // Act
      fallbackManager.clearOperationQueue();

      // Assert
      const queue = fallbackManager.getOperationQueue();
      expect(queue).toHaveLength(0);
    });
  });

  describe('persistence', () => {
    it('should persist and load queue from localStorage', async () => {
      // Arrange
      await fallbackManager.enableFallbackMode('test reason');
      fallbackManager.queueOperation('reminder.create', { title: 'Persistent Test' });

      // Act - Create a new instance to test loading from localStorage
      (fallbackManager as any).instance = null;
      const newFallbackManager = require('../fallbackManager').fallbackManager;

      // Assert
      const queue = newFallbackManager.getOperationQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].operation).toBe('reminder.create');
      expect(queue[0].data.title).toBe('Persistent Test');
    });
  });
});