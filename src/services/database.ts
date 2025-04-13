import SQLite from 'react-native-sqlite-storage';
import {BloodGlucose} from '../types/BloodGlucose';

// Enable SQLite debugging
SQLite.enablePromise(true);

const database_name = 'BloodGlucose.db';

export class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;

  async initDB() {
    if (this.isInitialized) return this.db;

    try {
      this.db = await SQLite.openDatabase({
        name: database_name,
      });
      await this.createTable();
      this.isInitialized = true;
      return this.db;
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initDB();
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

  async addReading(reading: Omit<BloodGlucose, 'id'>): Promise<BloodGlucose> {
    await this.ensureInitialized();
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.db.executeSql(
        'INSERT INTO blood_glucose (value, unit, timestamp, sourceName, notes) VALUES (?, ?, ?, ?, ?)',
        [
          reading.value,
          reading.unit,
          reading.timestamp.toISOString(),
          reading.sourceName || 'Manual',
          reading.notes || null,
        ],
      );

      const insertedId = result[0].insertId;
      return {
        ...reading,
        id: insertedId.toString(),
        sourceName: reading.sourceName || 'Manual',
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
          sourceName: row.sourceName || 'Manual',
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
