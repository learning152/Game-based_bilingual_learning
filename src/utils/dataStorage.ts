import * as fs from 'fs';
import * as path from 'path';

/**
 * 本地数据存储管理工具类
 * 用于管理本地JSON文件的读写操作
 */
export class DataStorage {
  private dataDir: string;

  constructor(dataDir: string = './data') {
    this.dataDir = dataDir;
    this.ensureDataDirectory();
  }

  /**
   * 确保数据目录存在
   */
  private ensureDataDirectory(): void {
    const directories = [
      this.dataDir,
      path.join(this.dataDir, 'users'),
      path.join(this.dataDir, 'courses'),
      path.join(this.dataDir, 'backups'),
      path.join(this.dataDir, 'lessons'),
      path.join(this.dataDir, 'achievements')
    ];

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * 读取JSON文件
   * @param category 数据类别（users, courses等）
   * @param filename 文件名
   * @returns 解析后的数据对象，失败返回null
   */
  public readData<T>(category: string, filename: string): T | null {
    try {
      const filePath = path.join(this.dataDir, category, `${filename}.json`);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`文件不存在: ${filePath}`);
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      console.error(`读取数据失败 [${category}/${filename}]:`, error);
      return null;
    }
  }

  /**
   * 写入JSON文件
   * @param category 数据类别
   * @param filename 文件名
   * @param data 要写入的数据
   * @returns 是否写入成功
   */
  public writeData<T>(category: string, filename: string, data: T): boolean {
    try {
      const categoryPath = path.join(this.dataDir, category);
      if (!fs.existsSync(categoryPath)) {
        fs.mkdirSync(categoryPath, { recursive: true });
      }

      const filePath = path.join(categoryPath, `${filename}.json`);
      const jsonContent = JSON.stringify(data, null, 2);
      
      fs.writeFileSync(filePath, jsonContent, 'utf-8');
      console.log(`数据写入成功: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`写入数据失败 [${category}/${filename}]:`, error);
      return false;
    }
  }

  /**
   * 删除数据文件
   * @param category 数据类别
   * @param filename 文件名
   * @returns 是否删除成功
   */
  public deleteData(category: string, filename: string): boolean {
    try {
      const filePath = path.join(this.dataDir, category, `${filename}.json`);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`文件不存在，无需删除: ${filePath}`);
        return false;
      }

      fs.unlinkSync(filePath);
      console.log(`数据删除成功: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`删除数据失败 [${category}/${filename}]:`, error);
      return false;
    }
  }

  /**
   * 列出某类别下的所有文件
   * @param category 数据类别
   * @returns 文件名数组（不含扩展名）
   */
  public listFiles(category: string): string[] {
    try {
      const categoryPath = path.join(this.dataDir, category);
      
      if (!fs.existsSync(categoryPath)) {
        return [];
      }

      return fs.readdirSync(categoryPath)
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      console.error(`列出文件失败 [${category}]:`, error);
      return [];
    }
  }

  /**
   * 创建数据备份
   * @param category 数据类别
   * @param filename 文件名
   * @returns 备份文件路径，失败返回null
   */
  public createBackup(category: string, filename: string): string | null {
    try {
      const sourcePath = path.join(this.dataDir, category, `${filename}.json`);
      
      if (!fs.existsSync(sourcePath)) {
        console.warn(`源文件不存在，无法备份: ${sourcePath}`);
        return null;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `${category}_${filename}_${timestamp}.json`;
      const backupPath = path.join(this.dataDir, 'backups', backupFilename);

      fs.copyFileSync(sourcePath, backupPath);
      console.log(`备份创建成功: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error(`创建备份失败 [${category}/${filename}]:`, error);
      return null;
    }
  }

  /**
   * 从备份恢复数据
   * @param backupFilename 备份文件名
   * @param targetCategory 目标数据类别
   * @param targetFilename 目标文件名
   * @returns 是否恢复成功
   */
  public restoreFromBackup(
    backupFilename: string, 
    targetCategory: string, 
    targetFilename: string
  ): boolean {
    try {
      const backupPath = path.join(this.dataDir, 'backups', backupFilename);
      
      if (!fs.existsSync(backupPath)) {
        console.error(`备份文件不存在: ${backupPath}`);
        return false;
      }

      const targetPath = path.join(this.dataDir, targetCategory, `${targetFilename}.json`);
      fs.copyFileSync(backupPath, targetPath);
      
      console.log(`数据恢复成功: ${targetPath}`);
      return true;
    } catch (error) {
      console.error(`恢复数据失败:`, error);
      return false;
    }
  }
}

// 导出单例实例
export const dataStorage = new DataStorage();