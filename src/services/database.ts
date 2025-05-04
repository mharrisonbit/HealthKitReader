import SQLite from 'react-native-sqlite-storage';
import {BloodGlucose} from '../types/BloodGlucose';
import Logger from '../utils/logger';

// Enable SQLite debugging
SQLite.enablePromise(true);

const database_name = 'BloodGlucose.db';
const database_version = 3; // Increment version for schema change

export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private async initDB(): Promise<void> {
    if (this.db) {
      Logger.log('Database already initialized');
      return;
    }

    Logger.log('Initializing database...');
    try {
      this.db = await SQLite.openDatabase({
        name: 'bloodGlucose.db',
        location: 'default',
      });
      await this.createTables();
      Logger.log('Database initialized successfully');
    } catch (error) {
      Logger.error('Error initializing database:', error);
      throw error;
    }
  }

  private async migrateDatabase(): Promise<void> {
    try {
      await this.db?.executeSql(`
        CREATE TABLE IF NOT EXISTS readings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          value REAL NOT NULL,
          unit TEXT NOT NULL,
          timestamp DATETIME NOT NULL,
          sourceName TEXT,
          notes TEXT
        );
      `);
    } catch (error) {
      Logger.error('Error migrating database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    try {
      await this.db?.executeSql(`
        CREATE TABLE IF NOT EXISTS readings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          value REAL NOT NULL,
          unit TEXT NOT NULL,
          timestamp DATETIME NOT NULL,
          sourceName TEXT,
          notes TEXT
        );
      `);
    } catch (error) {
      Logger.error('Error creating table:', error);
      throw error;
    }
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initDB();
    }
  }

  async addReading(reading: Omit<BloodGlucose, 'id'>): Promise<BloodGlucose> {
    await this.ensureInitialized();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const id = `${reading.timestamp.getTime()}_${Math.random()
      .toString(36)
      .substring(7)}_${reading.sourceName}`;

    const newReading: BloodGlucose = {
      ...reading,
      id,
    };

    await this.db.transaction(tx => {
      tx.executeSql(
        `INSERT OR REPLACE INTO readings 
        (id, value, unit, timestamp, sourceName, notes) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          reading.value,
          reading.unit,
          reading.timestamp.toISOString(),
          reading.sourceName,
          reading.notes || null,
        ],
      );
    });

    return newReading;
  }

  async getAllReadings(): Promise<BloodGlucose[]> {
    Logger.log('Getting all readings...');
    await this.ensureInitialized();
    if (!this.db) {
      Logger.error('Database not initialized');
      throw new Error('Database not initialized');
    }

    try {
      const [results] = await this.db.executeSql(
        'SELECT * FROM readings ORDER BY timestamp DESC',
      );
      Logger.log('Query executed successfully, processing results...');

      const readings: BloodGlucose[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        readings.push({
          id: row.id,
          value: row.value,
          unit: row.unit,
          timestamp: new Date(row.timestamp),
          sourceName: row.sourceName,
          notes: row.notes,
        });
      }

      Logger.log(`Processed ${readings.length} readings`);
      return readings;
    } catch (error) {
      Logger.error('Error getting all readings:', error);
      throw error;
    }
  }

  async deleteReading(id: number): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.executeSql('DELETE FROM readings WHERE id = ?', [id]);
    } catch (error) {
      Logger.error('Error deleting reading:', error);
      throw error;
    }
  }

  async deleteAllReadings(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.executeSql('DELETE FROM readings');
    } catch (error) {
      Logger.error('Error deleting all readings:', error);
      throw error;
    }
  }

  async updateReading(reading: BloodGlucose): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.executeSql(
        'UPDATE readings SET value = ?, unit = ?, timestamp = ?, sourceName = ?, notes = ? WHERE id = ?',
        [
          reading.value,
          reading.unit,
          reading.timestamp.toISOString(),
          reading.sourceName,
          reading.notes,
          reading.id,
        ],
      );
    } catch (error) {
      Logger.error('Error updating reading:', error);
      throw error;
    }
  }

  async getReadingById(id: number): Promise<BloodGlucose | null> {
    await this.ensureInitialized();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const [results] = await this.db.executeSql(
        'SELECT * FROM readings WHERE id = ?',
        [id],
      );

      if (results.rows.length === 0) {
        return null;
      }

      const row = results.rows.item(0);
      return {
        id: row.id,
        value: row.value,
        unit: row.unit,
        timestamp: new Date(row.timestamp),
        sourceName: row.sourceName,
        notes: row.notes,
      };
    } catch (error) {
      Logger.error('Error getting reading by id:', error);
      throw error;
    }
  }

  async getReadingsByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<BloodGlucose[]> {
    Logger.log('Getting readings by date range...');
    await this.ensureInitialized();
    if (!this.db) {
      Logger.error('Database not initialized');
      throw new Error('Database not initialized');
    }

    try {
      const [results] = await this.db.executeSql(
        'SELECT * FROM readings WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp DESC',
        [startDate.toISOString(), endDate.toISOString()],
      );
      Logger.log('Query executed successfully, processing results...');

      const readings: BloodGlucose[] = [];
      for (let i = 0; i < results.rows.length; i++) {
        const row = results.rows.item(i);
        readings.push({
          id: row.id,
          value: row.value,
          unit: row.unit,
          timestamp: new Date(row.timestamp),
          sourceName: row.sourceName,
          notes: row.notes,
        });
      }

      Logger.log(`Processed ${readings.length} readings for date range`);
      return readings;
    } catch (error) {
      Logger.error('Error getting readings by date range:', error);
      throw error;
    }
  }

  async closeDatabase() {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }

  async getReadingByHealthKitId(
    healthKitId: string,
  ): Promise<BloodGlucose | null> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      this.db?.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM readings WHERE healthKitId = ?',
          [healthKitId],
          (_, results) => {
            if (results.rows.length > 0) {
              const row = results.rows.item(0);
              resolve({
                ...row,
                timestamp: new Date(row.timestamp),
              });
            } else {
              resolve(null);
            }
          },
          (_, error) => {
            reject(error);
            return false;
          },
        );
      });
    });
  }

  async resetDatabase(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.executeSql('DROP TABLE IF EXISTS readings');
      await this.createTables();
    } catch (error) {
      Logger.error('Error resetting database:', error);
      throw error;
    }
  }
}
