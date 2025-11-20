/**
 * 日志压缩模块
 * 提供日志文件的压缩和归档功能
 */
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// 压缩配置接口
export interface CompressionConfig {
  logDir: string;           // 日志目录
  maxUncompressedAge: number; // 未压缩日志文件最大保留天数
  compressionLevel: number; // 压缩级别 (0-9)
  deleteOriginal: boolean;  // 压缩后是否删除原文件
  maxConcurrency: number;   // 最大并发压缩数量
}

/**
 * 日志压缩器类
 */
export class LogCompressor {
  private config: CompressionConfig;

  /**
   * 构造函数
   * @param config 压缩配置
   */
  constructor(config: Partial<CompressionConfig> = {}) {
    this.config = {
      logDir: './logs',
      maxUncompressedAge: 7, // 7天
      compressionLevel: 6,
      deleteOriginal: true,
      maxConcurrency: 3,     // 默认并发3个文件
      ...config
    };
  }

  /**
   * 压缩单个日志文件
   * @param filePath 文件路径
   * @returns 是否压缩成功
   */
  public async compressFile(filePath: string): Promise<boolean> {
    try {
      // 检查文件是否已经压缩
      if (filePath.endsWith('.gz')) {
        console.log(`文件已压缩: ${filePath}`);
        return true;
      }

      // 读取原始文件
      const data = await readFile(filePath);
      
      // 压缩数据
      const compressed = await gzip(data, {
        level: this.config.compressionLevel
      });

      // 写入压缩文件
      const compressedPath = `${filePath}.gz`;
      await writeFile(compressedPath, compressed);

      // 删除原文件（如果配置允许）
      if (this.config.deleteOriginal) {
        await unlink(filePath);
      }

      const originalSize = data.length;
      const compressedSize = compressed.length;
      const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(2);

      console.log(`压缩完成: ${path.basename(filePath)}`);
      console.log(`原始大小: ${this.formatSize(originalSize)}`);
      console.log(`压缩后大小: ${this.formatSize(compressedSize)}`);
      console.log(`压缩率: ${ratio}%`);

      return true;
    } catch (error) {
      console.error(`压缩文件失败: ${filePath}`, error);
      return false;
    }
  }

  /**
   * 批量压缩旧日志文件（并行处理）
   * @returns 压缩文件数量
   */
  public async compressOldLogs(): Promise<number> {
    try {
      // 确保日志目录存在
      if (!fs.existsSync(this.config.logDir)) {
        console.log(`日志目录不存在: ${this.config.logDir}`);
        return 0;
      }

      // 获取所有日志文件
      const files = await readdir(this.config.logDir);
      const logFiles = files.filter(file => 
        file.endsWith('.log') && !file.endsWith('.gz')
      );

      // 计算日期阈值
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - this.config.maxUncompressedAge);

      // 筛选需要压缩的文件
      const filesToCompress: string[] = [];
      for (const file of logFiles) {
        const filePath = path.join(this.config.logDir, file);
        const fileStat = await stat(filePath);

        // 检查文件修改时间
        if (fileStat.mtime < thresholdDate) {
          filesToCompress.push(filePath);
        }
      }

      if (filesToCompress.length === 0) {
        console.log('没有需要压缩的文件');
        return 0;
      }

      console.log(`找到 ${filesToCompress.length} 个需要压缩的文件，开始并行压缩...`);

      // 并行压缩文件
      const compressedCount = await this.compressFilesParallel(filesToCompress);

      console.log(`批量压缩完成，成功压缩 ${compressedCount}/${filesToCompress.length} 个文件`);
      return compressedCount;
    } catch (error) {
      console.error('批量压缩日志失败:', error);
      return 0;
    }
  }

  /**
   * 并行压缩多个文件
   * @param filePaths 要压缩的文件路径数组
   * @returns 成功压缩的文件数量
   */
  private async compressFilesParallel(filePaths: string[]): Promise<number> {
    const startTime = Date.now();
    let successCount = 0;
    let failCount = 0;

    // 分批处理，每批最多 maxConcurrency 个文件
    for (let i = 0; i < filePaths.length; i += this.config.maxConcurrency) {
      const batch = filePaths.slice(i, i + this.config.maxConcurrency);
      
      // 并行压缩当前批次的文件
      const results = await Promise.allSettled(
        batch.map(filePath => this.compressFile(filePath))
      );

      // 统计结果
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value === true) {
          successCount++;
        } else {
          failCount++;
          if (result.status === 'rejected') {
            console.error(`压缩失败: ${batch[index]}`, result.reason);
          }
        }
      });

      // 显示进度
      const processed = i + batch.length;
      const progress = ((processed / filePaths.length) * 100).toFixed(1);
      console.log(`压缩进度: ${processed}/${filePaths.length} (${progress}%)`);
    }

    const duration = Date.now() - startTime;
    console.log(`并行压缩耗时: ${(duration / 1000).toFixed(2)}秒`);
    console.log(`成功: ${successCount}, 失败: ${failCount}`);

    return successCount;
  }

  /**
   * 解压日志文件
   * @param compressedPath 压缩文件路径
   * @param outputPath 输出路径（可选）
   * @returns 是否解压成功
   */
  public async decompressFile(
    compressedPath: string, 
    outputPath?: string
  ): Promise<boolean> {
    try {
      // 检查文件是否是压缩文件
      if (!compressedPath.endsWith('.gz')) {
        console.log(`文件不是压缩文件: ${compressedPath}`);
        return false;
      }

      // 读取压缩文件
      const compressed = await readFile(compressedPath);
      
      // 解压数据
      const decompressed = await promisify(zlib.gunzip)(compressed);

      // 确定输出路径
      const output = outputPath || compressedPath.replace('.gz', '');
      
      // 写入解压文件
      await writeFile(output, decompressed);

      console.log(`解压完成: ${path.basename(compressedPath)} -> ${path.basename(output)}`);
      return true;
    } catch (error) {
      console.error(`解压文件失败: ${compressedPath}`, error);
      return false;
    }
  }

  /**
   * 获取目录下的压缩统计信息
   * @returns 统计信息
   */
  public async getCompressionStats(): Promise<{
    totalFiles: number;
    compressedFiles: number;
    uncompressedFiles: number;
    totalOriginalSize: number;
    totalCompressedSize: number;
    compressionRatio: number;
  }> {
    try {
      const files = await readdir(this.config.logDir);
      
      let totalFiles = 0;
      let compressedFiles = 0;
      let uncompressedFiles = 0;
      let totalOriginalSize = 0;
      let totalCompressedSize = 0;

      for (const file of files) {
        const filePath = path.join(this.config.logDir, file);
        const fileStat = await stat(filePath);

        if (file.endsWith('.log.gz')) {
          compressedFiles++;
          totalCompressedSize += fileStat.size;
          totalFiles++;
        } else if (file.endsWith('.log')) {
          uncompressedFiles++;
          totalOriginalSize += fileStat.size;
          totalFiles++;
        }
      }

      // 估算压缩率
      const compressionRatio = totalCompressedSize > 0 
        ? ((1 - totalCompressedSize / (totalOriginalSize + totalCompressedSize)) * 100)
        : 0;

      return {
        totalFiles,
        compressedFiles,
        uncompressedFiles,
        totalOriginalSize,
        totalCompressedSize,
        compressionRatio
      };
    } catch (error) {
      console.error('获取压缩统计信息失败:', error);
      return {
        totalFiles: 0,
        compressedFiles: 0,
        uncompressedFiles: 0,
        totalOriginalSize: 0,
        totalCompressedSize: 0,
        compressionRatio: 0
      };
    }
  }

  /**
   * 格式化文件大小
   * @param bytes 字节数
   * @returns 格式化后的字符串
   */
  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * 启动自动压缩任务（定时任务）
   * @param intervalHours 检查间隔（小时）
   * @returns 定时器ID
   */
  public startAutoCompression(intervalHours: number = 24): NodeJS.Timeout {
    console.log(`启动自动压缩任务，检查间隔: ${intervalHours} 小时`);
    
    // 立即执行一次
    this.compressOldLogs();

    // 设置定时任务
    return setInterval(() => {
      console.log('执行定时压缩任务...');
      this.compressOldLogs();
    }, intervalHours * 60 * 60 * 1000);
  }
}

// 创建默认压缩器实例
export const logCompressor = new LogCompressor();