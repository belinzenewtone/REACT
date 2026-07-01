import { Paths, Directory, File } from 'expo-file-system';

function fileForName(name: string): File {
  const dir = new Directory(Paths.document, 'persist');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return new File(dir, `${name}.json`);
}

export const fileStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const file = fileForName(name);
      return file.exists ? await file.text() : null;
    } catch (error) {
      console.error(`Failed to read persisted state "${name}":`, error);
      return null;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const file = fileForName(name);
      file.write(value);
    } catch (error) {
      console.error(`Failed to write persisted state "${name}":`, error);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      const file = fileForName(name);
      if (file.exists) {
        file.delete();
      }
    } catch (error) {
      console.error(`Failed to remove persisted state "${name}":`, error);
    }
  },
};
