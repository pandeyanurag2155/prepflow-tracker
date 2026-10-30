import { settingsRepository } from '../repositories/settings.repository.js';

export const settingsService = {
  get: () => settingsRepository.get(),
  update: patch => settingsRepository.update(patch),
};
