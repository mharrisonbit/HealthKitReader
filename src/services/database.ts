import SQLite from 'react-native-sqlite-storage';
import {BloodGlucose} from '../types/BloodGlucose';

// Enable SQLite debugging
SQLite.enablePromise(true);

const database_name = 'BloodGlucose.db';
const database_version = 2; // Increment version for schema change

export class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;

  async initDB() {
    if (this.isInitialized) return this.db;

    try {
      this.db = await SQLite.openDatabase({
        name: database_name,
      });
      await this.migrateDatabase();
      await this.createTable();
      this.isInitialized = true;
      return this.db;
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  private async migrateDatabase() {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Check if version table exists
      const versionResult = await this.db.executeSql(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='version'",
      );

      let currentVersion = 1;
      if (versionResult[0].rows.length === 0) {
        // Create version table if it doesn't exist
        await this.db.executeSql(
          'CREATE TABLE IF NOT EXISTS version (version_number INTEGER PRIMARY KEY)',
        );
        await this.db.executeSql(
          'INSERT INTO version (version_number) VALUES (?)',
          [currentVersion],
        );
      } else {
        // Get current version
        const currentVersionResult = await this.db.executeSql(
          'SELECT version_number FROM version LIMIT 1',
        );
        currentVersion = currentVersionResult[0].rows.item(0).version_number;
      }

      if (currentVersion < database_version) {
        // Drop existing tables to recreate with new schema
        await this.db.executeSql('DROP TABLE IF EXISTS blood_glucose');

        // Update version number
        await this.db.executeSql('UPDATE version SET version_number = ?', [
          database_version,
        ]);
      }
    } catch (error) {
      console.error('Error migrating database:', error);
      throw error;
    }
  }

  private async createTable() {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      CREATE TABLE IF NOT EXISTS blood_glucose (
        id TEXT PRIMARY KEY,
        value REAL NOT NULL,
        unit TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        sourceName TEXT NOT NULL DEFAULT 'Manual Entry',
        notes TEXT
      )
    `;

    try {
      await this.db.executeSql(query);
    } catch (error) {
      console.error('Error creating table:', error);
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

    // Generate a unique ID using timestamp, random string, and source
    const timestamp = reading.timestamp.getTime();
    const randomString = Math.random().toString(36).substr(2, 9);
    const sourcePrefix = reading.sourceName.toLowerCase().replace(/\s+/g, '-');
    const id = `${sourcePrefix}-${timestamp}-${randomString}`;

    try {
      await this.db.executeSql(
        'INSERT INTO blood_glucose (id, value, unit, timestamp, sourceName, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [
          id,
          reading.value,
          reading.unit,
          reading.timestamp.toISOString(),
          reading.sourceName || 'Manual Entry',
          reading.notes || null,
        ],
      );

      return {
        ...reading,
        id,
        sourceName: reading.sourceName || 'Manual Entry',
      };
    } catch (error) {
      console.error('Error adding reading:', error);
      throw error;
    }
  }

  async getAllReadings(): Promise<BloodGlucose[]> {
    await this.ensureInitialized();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.executeSql(
        'SELECT * FROM blood_glucose ORDER BY timestamp DESC',
      );

      const readings: BloodGlucose[] = [];
      for (let i = 0; i < result[0].rows.length; i++) {
        const row = result[0].rows.item(i);
        readings.push({
          id: row.id.toString(),
          value: row.value,
          unit: row.unit,
          timestamp: new Date(row.timestamp),
          sourceName: row.sourceName || 'Manual Entry',
          notes: row.notes || undefined,
        });
      }
      return readings;
    } catch (error) {
      console.error('Error getting all readings:', error);
      throw error;
    }
  }

  async deleteReading(id: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.executeSql('DELETE FROM blood_glucose WHERE id = ?', [id]);
    } catch (error) {
      console.error('Error deleting reading:', error);
      throw error;
    }
  }

  async deleteAllReadings(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.executeSql('DELETE FROM blood_glucose');
    } catch (error) {
      console.error('Error deleting all readings:', error);
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
        'UPDATE blood_glucose SET value = ?, unit = ?, timestamp = ?, sourceName = ?, notes = ? WHERE id = ?',
        [
          reading.value,
          reading.unit,
          reading.timestamp.toISOString(),
          reading.sourceName || 'Manual',
          reading.notes || null,
          reading.id,
        ],
      );
    } catch (error) {
      console.error('Error updating reading:', error);
      throw error;
    }
  }

  async getReadingById(id: string): Promise<BloodGlucose | null> {
    await this.ensureInitialized();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.executeSql(
        'SELECT * FROM blood_glucose WHERE id = ?',
        [id],
      );

      if (result[0].rows.length === 0) {
        return null;
      }

      const row = result[0].rows.item(0);
      return {
        id: row.id.toString(),
        value: row.value,
        unit: row.unit,
        timestamp: new Date(row.timestamp),
        sourceName: row.sourceName || 'Manual',
        notes: row.notes || undefined,
      };
    } catch (error) {
      console.error('Error getting reading by id:', error);
      throw error;
    }
  }

  async getReadingsByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<BloodGlucose[]> {
    await this.ensureInitialized();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.executeSql(
        'SELECT * FROM blood_glucose WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp DESC',
        [startDate.toISOString(), endDate.toISOString()],
      );

      const readings: BloodGlucose[] = [];
      for (let i = 0; i < result[0].rows.length; i++) {
        const row = result[0].rows.item(i);
        readings.push({
          id: row.id.toString(),
          value: row.value,
          unit: row.unit,
          timestamp: new Date(row.timestamp),
          sourceName: row.sourceName || 'Manual',
          notes: row.notes || undefined,
        });
      }
      return readings;
    } catch (error) {
      console.error('Error getting readings by date range:', error);
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
}
