import { BaseRepository } from './BaseRepository';
import { User } from '../types';

class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  // Aqui você pode adicionar métodos específicos para o repositório de usuários, se necessário.
  // Por exemplo, encontrar um usuário pelo email:
  /*
  async findByEmail(email: string): Promise<User | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE email = $1`;
    try {
      const result = await databaseService.query(query, [email]);
      return result.rows.length > 0 ? (result.rows[0] as User) : null;
    } catch (error) {
      throw ErrorHandler.handle(error, `Failed to find user with email ${email}`);
    }
  }
  */
}

export const userRepository = new UserRepository();