import { ProgressManager, UserProgress, LevelProgress, GameSession } from '../models/Progress';

/**
 * 学习统计数据接口
 */
export interface LearningStats {
  // 总体统计
  totalScore: number;
  totalLevelsCompleted: number;
  totalLevelsUnlocked: number;
  totalAttempts: number;
  averageStars: number;
  
  // 时间统计
  totalStudyTime: number; // 总学习时长（分钟）
  studyDays: number; // 学习天数
  lastStudyDate: string;
  
  // 进度统计
  completionRate: number; // 完成率（百分比）
  successRate: number; // 成功率（百分比）
  
  // 课程统计
  courseStats: CourseStats[];
  
  // 最近会话
  recentSessions: GameSession[];
  
  // 学习趋势
  dailyProgress: DailyProgress[];
}

export interface CourseStats {
  courseId: string;
  courseName: string;
  totalScore: number;
  levelsCompleted: number;
  levelsTotal: number;
  completionRate: number;
  averageStars: number;
  lastStudyDate: string;
}

export interface DailyProgress {
  date: string;
  score: number;
  levelsCompleted: number;
  studyTime: number; // 分钟
  sessionsCount: number;
}

/**
 * 学习统计管理器
 */
export class LearningStatsManager {
  
  /**
   * 获取用户的综合学习统计
   */
  static getUserStats(userId: string): LearningStats {
    const sessions = ProgressManager.getUserSessions(userId);
    const progressData = this.getAllUserProgress(userId);
    
    // 计算总体统计
    const totalScore = progressData.reduce((sum, p) => sum + p.totalScore, 0);
    const allLevelsProgress = progressData.flatMap(p => Object.values(p.levelsProgress));
    const completedLevels = allLevelsProgress.filter(l => l.completed);
    const totalAttempts = allLevelsProgress.reduce((sum, l) => sum + l.attempts, 0);
    
    const averageStars = completedLevels.length > 0
      ? completedLevels.reduce((sum, l) => sum + l.stars, 0) / completedLevels.length
      : 0;
    
    // 计算时间统计
    const studyDates = new Set<string>();
    let totalStudyTime = 0;
    
    sessions.forEach(session => {
      const date = new Date(session.startTime).toISOString().split('T')[0];
      studyDates.add(date);
      
      if (session.endTime) {
        const duration = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
        totalStudyTime += duration / (1000 * 60); // 转换为分钟
      }
    });
    
    const lastStudyDate = sessions.length > 0 ? sessions[0].startTime : '';
    
    // 计算进度统计
    const totalLevels = allLevelsProgress.length;
    const completionRate = totalLevels > 0 
      ? (completedLevels.length / totalLevels) * 100 
      : 0;
    
    const completedSessions = sessions.filter(s => s.completed);
    const successRate = sessions.length > 0
      ? (completedSessions.length / sessions.length) * 100
      : 0;
    
    // 获取课程统计
    const courseStats = this.getCourseStats(progressData);
    
    // 获取最近10个会话
    const recentSessions = sessions.slice(0, 10);
    
    // 计算每日进度
    const dailyProgress = this.calculateDailyProgress(sessions);
    
    return {
      totalScore,
      totalLevelsCompleted: completedLevels.length,
      totalLevelsUnlocked: allLevelsProgress.filter(l => l.unlocked).length,
      totalAttempts,
      averageStars: Math.round(averageStars * 10) / 10,
      totalStudyTime: Math.round(totalStudyTime),
      studyDays: studyDates.size,
      lastStudyDate,
      completionRate: Math.round(completionRate * 10) / 10,
      successRate: Math.round(successRate * 10) / 10,
      courseStats,
      recentSessions,
      dailyProgress
    };
  }
  
  /**
   * 获取用户所有课程的进度数据
   */
  private static getAllUserProgress(userId: string): UserProgress[] {
    // 这里需要实现获取所有课程进度的逻辑
    // 暂时返回空数组，实际应该遍历所有课程
    const progressList: UserProgress[] = [];
    
    // TODO: 遍历所有课程ID，获取每个课程的进度
    // 这需要一个课程列表管理器
    
    return progressList;
  }
  
  /**
   * 计算各课程的统计数据
   */
  private static getCourseStats(progressData: UserProgress[]): CourseStats[] {
    return progressData.map(progress => {
      const levelsProgress = Object.values(progress.levelsProgress);
      const completedLevels = levelsProgress.filter(l => l.completed);
      const averageStars = completedLevels.length > 0
        ? completedLevels.reduce((sum, l) => sum + l.stars, 0) / completedLevels.length
        : 0;
      
      const lastStudyDate = levelsProgress
        .filter(l => l.lastAttemptAt)
        .sort((a, b) => new Date(b.lastAttemptAt!).getTime() - new Date(a.lastAttemptAt!).getTime())[0]
        ?.lastAttemptAt || progress.updatedAt;
      
      return {
        courseId: progress.courseId,
        courseName: this.getCourseName(progress.courseId),
        totalScore: progress.totalScore,
        levelsCompleted: completedLevels.length,
        levelsTotal: levelsProgress.length,
        completionRate: (completedLevels.length / levelsProgress.length) * 100,
        averageStars: Math.round(averageStars * 10) / 10,
        lastStudyDate
      };
    });
  }
  
  /**
   * 获取课程名称（临时方法）
   */
  private static getCourseName(courseId: string): string {
    // TODO: 从课程数据中获取实际名称
    const nameMap: { [key: string]: string } = {
      'english-beginner-1': '英语初级课程',
      'english-intermediate-1': '英语中级课程',
      'chinese-beginner-1': '中文初级课程',
      'chinese-intermediate-1': '中文中级课程'
    };
    
    return nameMap[courseId] || courseId;
  }
  
  /**
   * 计算每日学习进度
   */
  private static calculateDailyProgress(sessions: GameSession[]): DailyProgress[] {
    const dailyMap = new Map<string, DailyProgress>();
    
    sessions.forEach(session => {
      const date = new Date(session.startTime).toISOString().split('T')[0];
      
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          score: 0,
          levelsCompleted: 0,
          studyTime: 0,
          sessionsCount: 0
        });
      }
      
      const daily = dailyMap.get(date)!;
      daily.score += session.score;
      daily.levelsCompleted += session.completed ? 1 : 0;
      daily.sessionsCount += 1;
      
      if (session.endTime) {
        const duration = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
        daily.studyTime += duration / (1000 * 60); // 转换为分钟
      }
    });
    
    // 转换为数组并按日期排序（最近的在前）
    return Array.from(dailyMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30); // 只返回最近30天
  }
  
  /**
   * 获取学习成就数据
   */
  static getAchievements(userId: string): Achievement[] {
    const stats = this.getUserStats(userId);
    const achievements: Achievement[] = [];
    
    // 完成关卡成就
    if (stats.totalLevelsCompleted >= 1) {
      achievements.push({
        id: 'first-level',
        name: '初出茅庐',
        description: '完成第一个关卡',
        icon: '🎯',
        unlocked: true,
        unlockedAt: stats.lastStudyDate
      });
    }
    
    if (stats.totalLevelsCompleted >= 10) {
      achievements.push({
        id: 'ten-levels',
        name: '勤学苦练',
        description: '完成10个关卡',
        icon: '📚',
        unlocked: true,
        unlockedAt: stats.lastStudyDate
      });
    }
    
    if (stats.totalLevelsCompleted >= 50) {
      achievements.push({
        id: 'fifty-levels',
        name: '学海无涯',
        description: '完成50个关卡',
        icon: '🏆',
        unlocked: true,
        unlockedAt: stats.lastStudyDate
      });
    }
    
    // 连续学习成就
    if (stats.studyDays >= 7) {
      achievements.push({
        id: 'seven-days',
        name: '坚持不懈',
        description: '连续学习7天',
        icon: '🔥',
        unlocked: true,
        unlockedAt: stats.lastStudyDate
      });
    }
    
    // 高分成就
    if (stats.averageStars >= 4) {
      achievements.push({
        id: 'high-scorer',
        name: '精益求精',
        description: '平均星级达到4星以上',
        icon: '⭐',
        unlocked: true,
        unlockedAt: stats.lastStudyDate
      });
    }
    
    return achievements;
  }
  
  /**
   * 导出学习报告（JSON格式）
   */
  static exportReport(userId: string): string {
    const stats = this.getUserStats(userId);
    const achievements = this.getAchievements(userId);
    
    const report = {
      exportTime: new Date().toISOString(),
      userId,
      statistics: stats,
      achievements
    };
    
    return JSON.stringify(report, null, 2);
  }
}

/**
 * 成就数据接口
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}