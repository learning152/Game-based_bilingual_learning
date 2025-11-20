import * as fs from 'fs';
import * as path from 'path';
import { getDataStorageLogger } from './logManager';

// 获取数据存储日志记录器
const dataLogger = getDataStorageLogger();

/**
 * 本地数据存储管理工具类
 * 用于管理本地JSON文件的读写操作
 */
export class DataStorage {
  private dataDir: string;

  constructor(dataDir: string = './data') {
    this.dataDir = dataDir;
    dataLogger.info('初始化数据存储管理器', { dataDir });
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
        try {
          fs.mkdirSync(dir, { recursive: true });
          dataLogger.debug('创建数据目录', { directory: dir });
        } catch (error) {
          dataLogger.error('创建数据目录失败', {
            directory: dir,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    });
    dataLogger.info('数据目录检查完成', { baseDir: this.dataDir });
  }

  /**
   * 读取JSON文件
   * @param category 数据类别（users, courses等）
   * @param filename 文件名
   * @returns 解析后的数据对象，失败返回null
   */
  public readData<T>(category: string, filename: string): T | null {
    const startTime = Date.now();
    const filePath = path.join(this.dataDir, category, `${filename}.json`);
    
    dataLogger.debug('开始读取数据', { category, filename, filePath });
    
    try {
      if (!fs.existsSync(filePath)) {
        dataLogger.warn('文件不存在', { category, filename, filePath });
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content) as T;
      const duration = Date.now() - startTime;
      
      dataLogger.info('数据读取成功', { 
        category, 
        filename, 
        fileSize: content.length,
        duration: `${duration}ms`
      });
      
      return data;
    } catch (error) {
      dataLogger.error('读取数据失败', {
        category,
        filename,
        filePath,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
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
    const startTime = Date.now();
    
    dataLogger.debug('开始写入数据', { category, filename });
    
    try {
      const categoryPath = path.join(this.dataDir, category);
      if (!fs.existsSync(categoryPath)) {
        fs.mkdirSync(categoryPath, { recursive: true });
        dataLogger.debug('创建分类目录', { categoryPath });
      }

      const filePath = path.join(categoryPath, `${filename}.json`);
      const jsonContent = JSON.stringify(data, null, 2);
      
      fs.writeFileSync(filePath, jsonContent, 'utf-8');
      const duration = Date.now() - startTime;
      
      dataLogger.info('数据写入成功', { 
        category, 
        filename, 
        filePath,
        dataSize: jsonContent.length,
        duration: `${duration}ms`
      });
      
      return true;
    } catch (error) {
      dataLogger.error('写入数据失败', {
        category,
        filename,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
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
    const filePath = path.join(this.dataDir, category, `${filename}.json`);
    
    dataLogger.debug('尝试删除数据', { category, filename, filePath });
    
    try {
      if (!fs.existsSync(filePath)) {
        dataLogger.warn('文件不存在，无需删除', { category, filename, filePath });
        return false;
      }

      fs.unlinkSync(filePath);
      dataLogger.info('数据删除成功', { category, filename, filePath });
      return true;
    } catch (error) {
      dataLogger.error('删除数据失败', {
        category,
        filename,
        filePath,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  /**
   * 列出某类别下的所有文件
   * @param category 数据类别
   * @returns 文件名数组（不含扩展名）
   */
  public listFiles(category: string): string[] {
    dataLogger.debug('列出文件', { category });
    
    try {
      const categoryPath = path.join(this.dataDir, category);
      
      if (!fs.existsSync(categoryPath)) {
        dataLogger.warn('分类目录不存在', { category, categoryPath });
        return [];
      }

      const files = fs.readdirSync(categoryPath)
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
      
      dataLogger.info('文件列表获取成功', { category, fileCount: files.length });
      return files;
    } catch (error) {
      dataLogger.error('列出文件失败', {
        category,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
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
    const startTime = Date.now();
    dataLogger.info('开始创建数据备份', { category, filename });
    
    try {
      const sourcePath = path.join(this.dataDir, category, `${filename}.json`);
      
      if (!fs.existsSync(sourcePath)) {
        dataLogger.warn('源文件不存在，无法备份', { category, filename, sourcePath });
        return null;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `${category}_${filename}_${timestamp}.json`;
      const backupPath = path.join(this.dataDir, 'backups', backupFilename);

      fs.copyFileSync(sourcePath, backupPath);
      const duration = Date.now() - startTime;
      
      dataLogger.info('备份创建成功', { 
        category, 
        filename, 
        backupPath,
        duration: `${duration}ms`
      });
      
      return backupPath;
    } catch (error) {
      dataLogger.error('创建备份失败', {
        category,
        filename,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
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
    const startTime = Date.now();
    dataLogger.info('开始从备份恢复数据', { 
      backupFilename, 
      targetCategory, 
      targetFilename 
    });
    
    try {
      const backupPath = path.join(this.dataDir, 'backups', backupFilename);
      
      if (!fs.existsSync(backupPath)) {
        dataLogger.error('备份文件不存在', { backupFilename, backupPath });
        return false;
      }

      const targetPath = path.join(this.dataDir, targetCategory, `${targetFilename}.json`);
      fs.copyFileSync(backupPath, targetPath);
      const duration = Date.now() - startTime;
      
      dataLogger.info('数据恢复成功', { 
        backupFilename,
        targetCategory,
        targetFilename,
        targetPath,
        duration: `${duration}ms`
      });
      
      return true;
    } catch (error) {
      dataLogger.error('恢复数据失败', {
        backupFilename,
        targetCategory,
        targetFilename,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }
}

// 导出单例实例
export const dataStorage = new DataStorage();