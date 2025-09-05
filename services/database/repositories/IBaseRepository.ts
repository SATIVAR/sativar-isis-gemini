export interface IBaseRepository<T> {
  create(item: Omit<T, 'id'>): Promise<T>;
  update(id: string, item: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  find(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
}