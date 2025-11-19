import React, { useState, useEffect } from 'react';
import { Card, Typography, List, Tag, Button, Space, Empty, message } from 'antd';
import { BookOutlined, LockOutlined, CheckCircleOutlined, RightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { CourseManager, Course } from '../models/Course';

const { Title, Paragraph } = Typography;

// 定义课程类型，用于UI展示
interface CourseUIItem {
  id: string;
  title: string;
  description: string;
  language: 'english' | 'chinese';
  lessonCount: number;
  isLocked: boolean;
  progress: number;
}

const Courses: React.FC = () => {
  const [englishCourses, setEnglishCourses] = useState<CourseUIItem[]>([]);
  const [chineseCourses, setChineseCourses] = useState<CourseUIItem[]>([]);
  const [activeTab, setActiveTab] = useState<'english' | 'chinese'>('english');
  const navigate = useNavigate();

  useEffect(() => {
    // 检查用户登录状态
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
      message.warning('请先登录！');
      navigate('/login');
      return;
    }

    // 加载课程数据
    loadCourses();
  }, [navigate]);

  const loadCourses = () => {
    try {
      // 从本地数据库加载课程
      const courseIds = CourseManager.listCourses();
      const allCourses: Course[] = [];

      courseIds.forEach(courseId => {
        const course = CourseManager.getCourse(courseId);
        if (course) {
          allCourses.push(course);
        }
      });

      // 如果没有课程，创建一些示例课程
      if (allCourses.length === 0) {
        createSampleCourses();
        return;
      }

      // 转换为UI显示所需格式
      const english = allCourses
        .filter(course => course.language === 'english')
        .map(course => ({
          id: course.id,
          title: course.title,
          description: course.description,
          language: course.language,
          lessonCount: course.lessons.length,
          isLocked: false, // 示例中所有课程都是解锁状态
          progress: 0 // 示例中所有课程进度为0
        }));

      const chinese = allCourses
        .filter(course => course.language === 'chinese')
        .map(course => ({
          id: course.id,
          title: course.title,
          description: course.description,
          language: course.language,
          lessonCount: course.lessons.length,
          isLocked: false, // 示例中所有课程都是解锁状态
          progress: 0 // 示例中所有课程进度为0
        }));

      setEnglishCourses(english);
      setChineseCourses(chinese);
    } catch (error) {
      console.error('加载课程失败:', error);
      message.error('加载课程失败，请重试！');
    }
  };

  const createSampleCourses = () => {
    try {
      // 创建示例英语课程
      const englishCourse1: Course = {
        id: 'english-beginner-1',
        title: '英语初级课程 1',
        description: '适合英语初学者的基础词汇和简单对话',
        language: 'english',
        lessons: ['en-lesson-1', 'en-lesson-2', 'en-lesson-3'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const englishCourse2: Course = {
        id: 'english-intermediate-1',
        title: '英语中级课程 1',
        description: '提升你的英语阅读和写作能力',
        language: 'english',
        lessons: ['en-lesson-4', 'en-lesson-5', 'en-lesson-6', 'en-lesson-7'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 创建示例中文课程
      const chineseCourse1: Course = {
        id: 'chinese-beginner-1',
        title: '中文初级课程 1',
        description: '学习基础汉字和简单对话',
        language: 'chinese',
        lessons: ['cn-lesson-1', 'cn-lesson-2', 'cn-lesson-3'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const chineseCourse2: Course = {
        id: 'chinese-intermediate-1',
        title: '中文中级课程 1',
        description: '提升中文阅读和写作技能',
        language: 'chinese',
        lessons: ['cn-lesson-4', 'cn-lesson-5', 'cn-lesson-6'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 保存示例课程到本地数据库
      CourseManager.createCourse(englishCourse1);
      CourseManager.createCourse(englishCourse2);
      CourseManager.createCourse(chineseCourse1);
      CourseManager.createCourse(chineseCourse2);

      // 转换为UI显示所需格式
      setEnglishCourses([
        {
          id: englishCourse1.id,
          title: englishCourse1.title,
          description: englishCourse1.description,
          language: englishCourse1.language,
          lessonCount: englishCourse1.lessons.length,
          isLocked: false,
          progress: 0
        },
        {
          id: englishCourse2.id,
          title: englishCourse2.title,
          description: englishCourse2.description,
          language: englishCourse2.language,
          lessonCount: englishCourse2.lessons.length,
          isLocked: true,
          progress: 0
        }
      ]);

      setChineseCourses([
        {
          id: chineseCourse1.id,
          title: chineseCourse1.title,
          description: chineseCourse1.description,
          language: chineseCourse1.language,
          lessonCount: chineseCourse1.lessons.length,
          isLocked: false,
          progress: 0
        },
        {
          id: chineseCourse2.id,
          title: chineseCourse2.title,
          description: chineseCourse2.description,
          language: chineseCourse2.language,
          lessonCount: chineseCourse2.lessons.length,
          isLocked: true,
          progress: 0
        }
      ]);

      message.success('已创建示例课程数据');
    } catch (error) {
      console.error('创建示例课程失败:', error);
      message.error('创建示例课程失败，请重试！');
    }
  };

  const handleCourseClick = (courseId: string) => {
    // 后续将实现跳转到课程详情页面
    message.info(`选择了课程：${courseId}，课程详情页面即将开发`);
    // navigate(`/course/${courseId}`);
  };

  const renderCourseList = (courses: CourseUIItem[]) => {
    if (courses.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无课程数据"
        />
      );
    }

    return (
      <List
        grid={{ gutter: 16, column: 2 }}
        dataSource={courses}
        renderItem={(course) => (
          <List.Item>
            <Card 
              hoverable
              onClick={() => !course.isLocked && handleCourseClick(course.id)}
              style={{ opacity: course.isLocked ? 0.7 : 1 }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Title level={4} style={{ margin: 0 }}>
                    <BookOutlined style={{ marginRight: 8 }} />
                    {course.title}
                  </Title>
                  {course.isLocked ? (
                    <Tag icon={<LockOutlined />} color="default">未解锁</Tag>
                  ) : (
                    course.progress > 0 ? (
                      <Tag icon={<CheckCircleOutlined />} color="success">进行中 {course.progress}%</Tag>
                    ) : (
                      <Tag color="processing">可学习</Tag>
                    )
                  )}
                </div>
                <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 12 }}>
                  {course.description}
                </Paragraph>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{course.lessonCount} 课时</span>
                  {!course.isLocked && (
                    <Button 
                      type="primary" 
                      size="small" 
                      icon={<RightOutlined />}
                    >
                      开始学习
                    </Button>
                  )}
                </div>
              </Space>
            </Card>
          </List.Item>
        )}
      />
    );
  };

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2}>课程中心</Title>

      <div style={{ marginBottom: 20 }}>
        <Space size="middle">
          <Button 
            type={activeTab === 'english' ? 'primary' : 'default'}
            onClick={() => setActiveTab('english')}
          >
            英语课程
          </Button>
          <Button 
            type={activeTab === 'chinese' ? 'primary' : 'default'}
            onClick={() => setActiveTab('chinese')}
          >
            中文课程
          </Button>
        </Space>
      </div>

      {activeTab === 'english' ? renderCourseList(englishCourses) : renderCourseList(chineseCourses)}
    </div>
  );
};

export default Courses;