import { dataStorage } from '../utils/dataStorage';

export interface Lesson {
  id: string;
  title: string;
  content: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  type: 'vocabulary' | 'grammar' | 'conversation';
  language: 'english' | 'chinese';
}

export interface Level {
  id: string;
  order: number;
  title: string;
  description: string;
  requiredScore: number;
  lessons: string[]; // 存储 Lesson 的 id
}

export interface Course {
  id: string;
  title: string;
  description: string;
  language: 'english' | 'chinese';
  lessons: string[]; // 存储 Lesson 的 id
  createdAt: string;
  updatedAt: string;
}

export class CourseManager {
  private static readonly COURSE_CATEGORY = 'courses';
  private static readonly LESSON_CATEGORY = 'lessons';

  static createCourse(course: Course): boolean {
    return dataStorage.writeData(this.COURSE_CATEGORY, course.id, course);
  }

  static getCourse(courseId: string): Course | null {
    return dataStorage.readData<Course>(this.COURSE_CATEGORY, courseId);
  }

  static updateCourse(course: Course): boolean {
    return dataStorage.writeData(this.COURSE_CATEGORY, course.id, course);
  }

  static deleteCourse(courseId: string): boolean {
    return dataStorage.deleteData(this.COURSE_CATEGORY, courseId);
  }

  static listCourses(): string[] {
    return dataStorage.listFiles(this.COURSE_CATEGORY);
  }

  static createLesson(lesson: Lesson): boolean {
    return dataStorage.writeData(this.LESSON_CATEGORY, lesson.id, lesson);
  }

  static getLesson(lessonId: string): Lesson | null {
    return dataStorage.readData<Lesson>(this.LESSON_CATEGORY, lessonId);
  }

  static updateLesson(lesson: Lesson): boolean {
    return dataStorage.writeData(this.LESSON_CATEGORY, lesson.id, lesson);
  }

  static deleteLesson(lessonId: string): boolean {
    return dataStorage.deleteData(this.LESSON_CATEGORY, lessonId);
  }

  static listLessons(): string[] {
    return dataStorage.listFiles(this.LESSON_CATEGORY);
  }

  static createLevel(level: Level): boolean {
    return dataStorage.writeData(this.COURSE_CATEGORY, `level_${level.id}`, level);
  }

  static getLevel(levelId: string): Level | null {
    return dataStorage.readData<Level>(this.COURSE_CATEGORY, `level_${levelId}`);
  }

  static updateLevel(level: Level): boolean {
    return dataStorage.writeData(this.COURSE_CATEGORY, `level_${level.id}`, level);
  }

  static deleteLevel(levelId: string): boolean {
    return dataStorage.deleteData(this.COURSE_CATEGORY, `level_${levelId}`);
  }

  static listLevels(): string[] {
    return dataStorage.listFiles(this.COURSE_CATEGORY).filter(file => file.startsWith('level_'));
  }

  static backupCourse(courseId: string): string | null {
    return dataStorage.createBackup(this.COURSE_CATEGORY, courseId);
  }

  static restoreCourse(backupFilename: string, courseId: string): boolean {
    return dataStorage.restoreFromBackup(backupFilename, this.COURSE_CATEGORY, courseId);
  }
}