
import type { ISettingsRepository, IRemindersRepository } from './repositories/interfaces.ts';
import { LocalStorageSettingsRepository, LocalStorageRemindersRepository } from './repositories/LocalStorageRepository.ts';
import { ApiSettingsRepository, ApiRemindersRepository } from './repositories/ApiRepository.ts';

export class RepositoryFactory {
  static getLocalSettingsRepository(): ISettingsRepository {
    return new LocalStorageSettingsRepository();
  }
  
  static getApiSettingsRepository(): ISettingsRepository {
    return new ApiSettingsRepository();
  }

  static getLocalRemindersRepository(): IRemindersRepository {
    return new LocalStorageRemindersRepository();
  }

  static getApiRemindersRepository(): IRemindersRepository {
    return new ApiRemindersRepository();
  }
}