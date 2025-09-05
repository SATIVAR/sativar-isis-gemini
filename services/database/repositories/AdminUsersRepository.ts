import databaseService from '../index';
import { ErrorHandler, AppError, ErrorCode } from '../../../utils/errorHandler';

export interface AdminUser {
  id: number;
  username: string;
  passwordHash: string;
  isSuperAdmin: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

export class AdminUsersRepository {
  async findByUsername(username: string): Promise<AdminUser | null> {
    try {
      const query = `
        SELECT 
          id,
          username,
          password_hash,
          is_super_admin,
          created_at,
          last_login
        FROM admin_users
        WHERE username = $1
      `;
      
      const result = await databaseService.query(query, [username]);
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        username: row.username,
        passwordHash: row.password_hash,
        isSuperAdmin: row.is_super_admin,
        createdAt: row.created_at,
        lastLogin: row.last_login
      };
    } catch (error) {
      throw ErrorHandler.handle(error, 'Failed to find user by username');
    }
  }

  async create(user: Omit<AdminUser, 'id' | 'createdAt'>): Promise<AdminUser> {
    try {
      const query = `
        INSERT INTO admin_users (
          username,
          password_hash,
          is_super_admin,
          last_login
        ) VALUES ($1, $2, $3, $4)
        RETURNING id, created_at
      `;
      
      const values = [
        user.username,
        user.passwordHash,
        user.isSuperAdmin,
        user.lastLogin
      ];
      
      const result = await databaseService.query(query, values);
      const row = result.rows[0];
      
      return {
        id: row.id,
        username: user.username,
        passwordHash: user.passwordHash,
        isSuperAdmin: user.isSuperAdmin,
        createdAt: row.created_at,
        lastLogin: user.lastLogin
      };
    } catch (error) {
      throw ErrorHandler.handle(error, 'Failed to create admin user');
    }
  }

  async updateLastLogin(userId: number): Promise<void> {
    try {
      const query = `
        UPDATE admin_users
        SET last_login = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      
      await databaseService.query(query, [userId]);
    } catch (error) {
      throw ErrorHandler.handle(error, 'Failed to update user last login');
    }
  }
}

export const adminUsersRepository = new AdminUsersRepository();