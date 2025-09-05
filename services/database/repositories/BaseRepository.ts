import databaseService from '../index';
import { IBaseRepository } from './IBaseRepository';
import { ErrorHandler, AppError, ErrorCode } from '../../../utils/errorHandler';

export abstract class BaseRepository<T extends { id: string }> implements IBaseRepository<T> {
  protected readonly tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async create(item: Omit<T, 'id'>): Promise<T> {
    const columns = Object.keys(item).join(', ');
    const values = Object.values(item);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const query = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;

    try {
      const result = await databaseService.query(query, values);
      return result.rows[0] as T;
    } catch (error) {
      throw ErrorHandler.handle(error, `Failed to create item in ${this.tableName}`);
    }
  }

  async update(id: string, item: Partial<Omit<T, 'id'>>): Promise<T | null> {
    const entries = Object.entries(item);
    if (entries.length === 0) {
      throw new AppError(ErrorCode.DATA_VALIDATION_FAILED, 'No fields to update.');
    }

    const setClause = entries.map(([key], i) => `${key} = $${i + 1}`).join(', ');
    const values = entries.map(([, value]) => value);
    values.push(id);

    const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = $${values.length} RETURNING *`;

    try {
      const result = await databaseService.query(query, values);
      return result.rows.length > 0 ? (result.rows[0] as T) : null;
    } catch (error) {
      throw ErrorHandler.handle(error, `Failed to update item with id ${id} in ${this.tableName}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1`;

    try {
      const result = await databaseService.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      throw ErrorHandler.handle(error, `Failed to delete item with id ${id} from ${this.tableName}`);
    }
  }

  async find(id: string): Promise<T | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;

    try {
      const result = await databaseService.query(query, [id]);
      return result.rows.length > 0 ? (result.rows[0] as T) : null;
    } catch (error) {
      throw ErrorHandler.handle(error, `Failed to find item with id ${id} in ${this.tableName}`);
    }
  }

  async findAll(): Promise<T[]> {
    const query = `SELECT * FROM ${this.tableName}`;

    try {
      const result = await databaseService.query(query);
      return result.rows as T[];
    } catch (error) {
      throw ErrorHandler.handle(error, `Failed to find all items in ${this.tableName}`);
    }
  }
}