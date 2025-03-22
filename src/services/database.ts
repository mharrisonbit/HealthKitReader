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

  async addReading(reading: BloodGlucose): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      INSERT INTO blood_glucose (id, value, unit, timestamp, notes)
      VALUES (?, ?, ?, ?, ?)
    `;

    try {
      await this.db.executeSql(query, [
        reading.id,
        reading.value,
        reading.unit,
        reading.timestamp.toISOString(),
        reading.notes || null,
      ]);
    } catch (error) {
      console.error('Error adding reading:', error);
      throw error;
    }
  }

  async getAllReadings(): Promise<BloodGlucose[]> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      SELECT * FROM blood_glucose
      ORDER BY timestamp DESC
    `;

    try {
      const [results] = await this.db.executeSql(query);
      const readings: BloodGlucose[] = [];

      for (let index = 0; index < results.rows.length; index++) {
        const row = results.rows.item(index);
        readings.push({
          id: row.id,
          value: row.value,
          unit: row.unit,
          timestamp: new Date(row.timestamp),
          notes: row.notes || undefined,
        });
      }

      return readings;
    } catch (error) {
      console.error('Error getting readings:', error);
      throw error;
    }
  }

  async deleteReading(id: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      DELETE FROM blood_glucose
      WHERE id = ?
    `;

    try {
      await this.db.executeSql(query, [id]);
    } catch (error) {
      console.error('Error deleting reading:', error);
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
