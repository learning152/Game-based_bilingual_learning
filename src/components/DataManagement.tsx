import React, { useState } from 'react';
import { Button, Modal, Select, DatePicker, Space, message, Divider, Alert, Typography } from 'antd';
import { DownloadOutlined, RedoOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { DataExportManager } from '../utils/dataExportManager';
import { saveAs } from 'file-saver';
import moment from 'moment';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title, Text, Paragraph } = Typography;
const { confirm } = Modal;

interface DataManagementProps {
  userId: string;
  username: string;
}

const DataManagement: React.FC<DataManagementProps> = ({ userId, username }) => {
  const [exportLoading, setExportLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [dateRange, setDateRange] = useState<[moment.Moment | null, moment.Moment | null] | null>(null);
  const [includeUserData, setIncludeUserData] = useState(true);
  const [includeLogs, setIncludeLogs] = useState(false);

  // 处理导出数据
  const handleExportData = async () => {
    setExportLoading(true);
    try {
      // 导出用户数据
      let userData: string | null = null;
      if (includeUserData) {
        const exportedData = await DataExportManager.exportUserData(userId);
        userData = exportFormat === 'json' ? exportedData.json : exportedData.csv;
      }

      // 导出日志数据
      let logData: string | null = null;
      if (includeLogs && dateRange) {
        const startDate = dateRange[0] ? dateRange[0].format('YYYY-MM-DD') : undefined;
        const endDate = dateRange[1] ? dateRange[1].format('YYYY-MM-DD') : undefined;
        logData = await DataExportManager.exportUserLogs(userId, startDate, endDate);
      }
      // 创建合并的数据对象（如果两者都有）
      let finalData: string | null = null;
      if (userData && logData) {
        if (exportFormat === 'json') {
          // 合并JSON数据
          const userDataObj = JSON.parse(userData);
          const logDataObj = JSON.parse(logData);
          finalData = JSON.stringify({
            userData: userDataObj,
            logData: logDataObj
          }, null, 2);
        } else {
          // CSV格式不易合并,分别保存
          saveFile(`${username}_data.csv`, userData);
          saveFile(`${username}_logs.json`, logData);
          message.success('用户数据和日志已导出为单独的文件');
          setExportModalVisible(false);
          setExportLoading(false);
          return;
        }
      } else {
        finalData = userData || logData;
      }

      // 检查是否有数据需要导出
      if (!finalData) {
        message.warning('请至少选择一项导出内容');
        setExportLoading(false);
        return;
      }

      // 保存文件
      const filename = `${username}_export_${moment().format('YYYY-MM-DD_HH-mm')}.${exportFormat}`;
      saveFile(filename, finalData);
      
      message.success('数据导出成功');
      setExportModalVisible(false);
    } catch (error) {
      console.error('导出数据失败:', error);
      message.error('导出数据失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setExportLoading(false);
    }
  };

  // 保存文件的辅助函数
  const saveFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: exportFormat === 'json' ? 'application/json' : 'text/csv' });
    saveAs(blob, filename);
  };

  // 处理重置游戏进度
  const showResetConfirm = () => {
    confirm({
      title: '确认重置游戏进度',
      icon: <ExclamationCircleOutlined />,
      content: (
        <>
          <Paragraph>
            您确定要重置所有游戏进度吗？此操作将会：
          </Paragraph>
          <ul>
            <li>将学习进度重置为0%</li>
            <li>重置所有已解锁关卡和成就</li>
            <li>清除所有游戏统计数据</li>
          </ul>
          <Alert
            message="所有数据将在重置前自动备份，您可以在需要时导出备份文件"
            type="info"
            showIcon
          />
        </>
      ),
      okText: '确认重置',
      okType: 'danger',
      cancelText: '取消',
      onOk: handleResetProgress
    });
  };

  // 处理重置游戏进度
  const handleResetProgress = async () => {
    setResetLoading(true);
    try {
      await DataExportManager.resetUserProgress(userId);
      message.success('游戏进度已成功重置');
      
      // 提示用户刷新页面以更新显示
      Modal.success({
        title: '重置成功',
        content: '游戏进度已成功重置，请刷新页面查看更新后的状态',
        okText: '刷新页面',
        onOk: () => window.location.reload()
      });
    } catch (error) {
      console.error('重置游戏进度失败:', error);
      message.error('重置游戏进度失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <>
      <Divider orientation="left">数据管理</Divider>
      <Space size="middle">
        <Button 
          type="primary" 
          icon={<DownloadOutlined />}
          onClick={() => setExportModalVisible(true)}
        >
          导出数据
        </Button>
        <Button 
          danger 
          icon={<RedoOutlined />} 
          onClick={showResetConfirm}
          loading={resetLoading}
        >
          重新开始游戏
        </Button>
      </Space>

      {/* 数据导出设置对话框 */}
      <Modal
        title="数据导出选项"
        visible={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        onOk={handleExportData}
        okText="导出"
        cancelText="取消"
        confirmLoading={exportLoading}
        width={500}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>导出内容：</Text>
            <div style={{ marginTop: 8 }}>
              <Space>
                <Button 
                  type={includeUserData ? "primary" : "default"} 
                  onClick={() => setIncludeUserData(!includeUserData)}
                >
                  用户数据
                </Button>
                <Button 
                  type={includeLogs ? "primary" : "default"} 
                  onClick={() => setIncludeLogs(!includeLogs)}
                >
                  日志记录
                </Button>
              </Space>
            </div>
          </div>

          <div>
            <Text strong>导出格式：</Text>
            <div style={{ marginTop: 8 }}>
              <Select 
                defaultValue="json" 
                style={{ width: 120 }}
                onChange={(value) => setExportFormat(value as 'json' | 'csv')}
              >
                <Option value="json">JSON</Option>
                <Option value="csv">CSV</Option>
              </Select>
            </div>
          </div>
          
          {includeLogs && (
            <div>
              <Text strong>日志时间范围：</Text>
              <div style={{ marginTop: 8 }}>
                <RangePicker 
                  onChange={(dates) => {
                    setDateRange([
                      dates?.[0] ? moment(dates[0].format('YYYY-MM-DD HH:mm:ss')) : null,
                      dates?.[1] ? moment(dates[1].format('YYYY-MM-DD HH:mm:ss')) : null
                    ]);
                  }}
                />
              </div>
            </div>
          )}
          
          <Alert
            message="说明"
            description={
              <>
                <p>- 用户数据：包含个人信息、学习进度和成就</p>
                <p>- 日志记录：包含学习活动和系统日志</p>
                {exportFormat === 'csv' && includeLogs && (
                  <p>- 注意：日志数据将以单独的JSON文件导出，不支持CSV格式</p>
                )}
              </>
            }
            type="info"
            showIcon
          />
        </Space>
      </Modal>
    </>
  );
};

export default DataManagement;