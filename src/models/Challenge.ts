/**
 * 挑战数据模型
 * 定义关卡系统中各种类型挑战的数据结构
 */

// 挑战基础接口
export interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  description?: string;
  content: ChallengeContent;
  difficulty: number; // 1-5 难度等级
  timeLimit?: number; // 时间限制（秒）
  maxAttempts?: number; // 最大尝试次数
  points: number; // 完成后获得的分数
}

// 挑战类型枚举
export type ChallengeType = 
  | 'wordCompletion'    // 单词补全
  | 'translation'       // 翻译练习
  | 'listening'         // 听力练习
  | 'speaking'          // 口语练习
  | 'reading'           // 阅读理解
  | 'grammar'           // 语法练习
  | 'vocabulary'        // 词汇练习
  | 'dialogue';         // 对话练习

// 挑战内容联合类型
export type ChallengeContent = 
  | WordCompletionContent
  | TranslationContent
  | ListeningContent
  | SpeakingContent
  | ReadingContent
  | GrammarContent
  | VocabularyContent
  | DialogueContent;

// 单词补全挑战内容
export interface WordCompletionContent {
  type: 'wordCompletion';
  sentence: string;        // 包含空白的句子
  correctAnswer: string;   // 正确答案
  hints?: string[];        // 提示信息
  options?: string[];      // 选择项（多选题模式）
}

// 翻译挑战内容
export interface TranslationContent {
  type: 'translation';
  sourceText: string;      // 源文本
  targetLanguage: 'en' | 'zh'; // 目标语言
  correctAnswer: string;   // 参考答案
  alternativeAnswers?: string[]; // 其他可接受的答案
}

// 听力挑战内容
export interface ListeningContent {
  type: 'listening';
  audioUrl: string;        // 音频文件路径
  transcript?: string;     // 听力原文（用于验证）
  questions: ListeningQuestion[]; // 听力问题
}

export interface ListeningQuestion {
  id: string;
  question: string;
  type: 'multipleChoice' | 'fillBlank' | 'shortAnswer';
  options?: string[];      // 选择题选项
  correctAnswer: string;
}

// 口语挑战内容
export interface SpeakingContent {
  type: 'speaking';
  prompt: string;          // 口语提示
  targetText?: string;     // 目标文本（朗读模式）
  evaluationCriteria: string[]; // 评价标准
  maxRecordingTime: number; // 最大录音时间（秒）
}

// 阅读理解挑战内容
export interface ReadingContent {
  type: 'reading';
  passage: string;         // 阅读文章
  questions: ReadingQuestion[]; // 阅读问题
}

export interface ReadingQuestion {
  id: string;
  question: string;
  type: 'multipleChoice' | 'trueOrFalse' | 'shortAnswer';
  options?: string[];
  correctAnswer: string;
  explanation?: string;    // 答案解释
}

// 语法挑战内容
export interface GrammarContent {
  type: 'grammar';
  rule: string;            // 语法规则说明
  examples: string[];      // 示例句子
  exercises: GrammarExercise[]; // 语法练习
}

export interface GrammarExercise {
  id: string;
  sentence: string;        // 待完成的句子
  blanks: GrammarBlank[];  // 空白处信息
}

export interface GrammarBlank {
  position: number;        // 空白位置
  correctAnswer: string;
  options?: string[];      // 选择项
  hint?: string;
}

// 词汇挑战内容
export interface VocabularyContent {
  type: 'vocabulary';
  words: VocabularyItem[]; // 词汇列表
  exerciseType: 'definition' | 'synonym' | 'antonym' | 'usage'; // 练习类型
}

export interface VocabularyItem {
  word: string;
  definition: string;
  pronunciation?: string;  // 音标
  examples: string[];      // 例句
  synonyms?: string[];     // 同义词
  antonyms?: string[];     // 反义词
}

// 对话挑战内容
export interface DialogueContent {
  type: 'dialogue';
  scenario: string;        // 对话场景描述
  characters: DialogueCharacter[]; // 对话角色
  dialogue: DialogueTurn[]; // 对话轮次
  userRole: string;        // 用户扮演的角色ID
}

export interface DialogueCharacter {
  id: string;
  name: string;
  description?: string;
}

export interface DialogueTurn {
  characterId: string;
  text?: string;           // 固定对话文本
  isUserTurn: boolean;     // 是否为用户回合
  expectedResponses?: string[]; // 用户预期回应（用于评分）
  hints?: string[];        // 提示信息
}

// 挑战完成结果
export interface ChallengeResult {
  challengeId: string;
  userId: string;
  score: number;           // 得分（0-100）
  timeSpent: number;       // 用时（秒）
  attempts: number;        // 尝试次数
  isCompleted: boolean;    // 是否完成
  answers: ChallengeAnswer[]; // 用户答案
  completedAt: string;     // 完成时间
}

// 用户答案
export interface ChallengeAnswer {
  questionId?: string;     // 问题ID（如果有多个问题）
  userAnswer: any;         // 用户答案
  correctAnswer: any;      // 正确答案
  isCorrect: boolean;      // 是否正确
  partialScore?: number;   // 部分得分
}