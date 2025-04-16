import {DatabaseService} from '../services/database';
import SQLite from 'react-native-sqlite-storage';

// Mock SQLite
jest.mock('react-native-sqlite-storage', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn(callback =>
      callback({
        executeSql: jest.fn((query, params, success, error) => {
          success(null, {rows: {length: 0, item: () => null, _array: []}});
        }),
      }),
    ),
  })),
}));

describe('DatabaseService', () => {
  let dbService: DatabaseService;

  beforeEach(() => {
    jest.clearAllMocks();
    dbService = DatabaseService.getInstance();
  });

  it('should initialize database correctly', async () => {
    expect(SQLite.openDatabase).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'BloodGlucoseDB.db',
        location: 'default',
      }),
    );
  });

  it('should add a reading successfully', async () => {
    const reading = {
      value: 120,
      timestamp: new Date().toISOString(),
      notes: 'Test reading',
    };

    const id = await dbService.addReading(reading);
    expect(id).toBeDefined();
  });

  it('should get all readings', async () => {
    const readings = await dbService.getAllReadings();
    expect(Array.isArray(readings)).toBe(true);
  });

  it('should delete a reading', async () => {
    const success = await dbService.deleteReading('test-id');
    expect(success).toBe(true);
  });

  it('should handle database errors gracefully', async () => {
    // Mock a database error
    (SQLite.openDatabase as jest.Mock).mockImplementationOnce(() => ({
      transaction: jest.fn(callback =>
        callback({
          executeSql: jest.fn((query, params, success, error) => {
            error(new Error('Database error'));
          }),
        }),
      ),
    }));

    await expect(
      dbService.addReading({
        value: 120,
        timestamp: new Date().toISOString(),
        notes: 'Test reading',
      }),
    ).rejects.toThrow('Database error');
  });

  it('should maintain singleton instance', () => {
    const instance1 = DatabaseService.getInstance();
    const instance2 = DatabaseService.getInstance();
    expect(instance1).toBe(instance2);
  });
});
