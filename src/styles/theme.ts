// Ant Design 主题配置文件
export const theme = {
  token: {
    // 主题色
    colorPrimary: '#1890ff',
    // 链接色
    colorLink: '#1890ff',
    // 成功色
    colorSuccess: '#52c41a',
    // 警告色
    colorWarning: '#faad14',
    // 错误色
    colorError: '#f5222d',
    // 字体基础大小
    fontSize: 14,
    // 圆角大小
    borderRadius: 4,
  },
  components: {
    Button: {
      colorPrimary: '#1890ff',
      algorithm: true,
    },
    Input: {
      colorPrimary: '#1890ff',
    },
  },
};

// 深色主题配置
export const darkTheme = {
  ...theme,
  token: {
    ...theme.token,
    colorBgBase: '#141414',
    colorTextBase: 'rgba(255, 255, 255, 0.85)',
  },
};