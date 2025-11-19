import { dataStorage } from '../utils/dataStorage';

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  lastLogin: string;
  learningProgress: {
    english: number;
    chinese: number;
  };
}

export class UserManager {
  private static readonly CATEGORY = 'users';

  static createUser(user: User): boolean {
    return dataStorage.writeData(this.CATEGORY, user.id, user);
  }

  static getUser(userId: string): User | null {
    return dataStorage.readData<User>(this.CATEGORY, userId);
  }

  static updateUser(user: User): boolean {
    return dataStorage.writeData(this.CATEGORY, user.id, user);
  }

  static deleteUser(userId: string): boolean {
    return dataStorage.deleteData(this.CATEGORY, userId);
  }

  static listUsers(): string[] {
    return dataStorage.listFiles(this.CATEGORY);
  }

  static backupUser(userId: string): string | null {
    return dataStorage.createBackup(this.CATEGORY, userId);
  }

  static restoreUser(backupFilename: string, userId: string): boolean {
    return dataStorage.restoreFromBackup(backupFilename, this.CATEGORY, userId);
  }
}