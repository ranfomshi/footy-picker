import React, { useState } from 'react';
import { Modal, Button, Typography, Card, Space, Divider, message } from 'antd';
import { CalendarOutlined, ClockCircleOutlined, EnvironmentOutlined, CheckCircleOutlined, CloseOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const AvailabilityPromptModal = ({
  visible,
  onClose,
  gameweeks = [],
  currentPlayer,
  setPlayerAvailability,
  formatDate,
  formatTime
}) => {
  const [loading, setLoading] = useState({});

  // Early return if no data
  if (!visible || !currentPlayer || gameweeks.length === 0) {
    return null;
  }

  const handleAvailabilityChange = async (gameweekId, available) => {
    setLoading(prev => ({ ...prev, [gameweekId]: true }));
    
    try {
      await setPlayerAvailability(currentPlayer.id, gameweekId, available);
      message.success(available ? 'Marked as available' : 'Marked as not available');
    } catch (error) {
      console.error('Error updating availability:', error);
      message.error('Failed to update availability');
    } finally {
      setLoading(prev => ({ ...prev, [gameweekId]: false }));
    }
  };

  const handleClose = () => {
    // Mark as dismissed for today
    const today = new Date().toDateString();
    localStorage.setItem('availabilityPromptDismissed', today);
    onClose();
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CalendarOutlined style={{ color: '#00b96b', fontSize: 18 }} />
          <Title level={4} style={{ margin: 0, color: '#1f2937' }}>
            Set Your Availability
          </Title>
        </div>
      }
      open={visible}
      onCancel={handleClose}
      footer={[
        <Button key="later" onClick={handleClose}>
          I'll do this later
        </Button>
      ]}
      width={600}
      centered
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <Text style={{ color: '#6b7280', fontSize: 14 }}>
          You have upcoming fixtures that need your availability response. 
          Please let us know if you can attend so we can organize the teams.
        </Text>
      </div>

      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {gameweeks.map((gameweek, index) => (
          <Card
            key={gameweek.id}
            style={{
              marginBottom: index < gameweeks.length - 1 ? 16 : 0,
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
            bodyStyle={{ padding: 16 }}
          >
            {/* Fixture Details */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <CalendarOutlined style={{ color: '#00b96b', fontSize: 16 }} />
                <Text strong style={{ fontSize: 16, color: '#1f2937' }}>
                  {formatDate(gameweek.date)}
                </Text>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 28 }}>
                {gameweek.startTime && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ClockCircleOutlined style={{ color: '#6b7280', fontSize: 12 }} />
                    <Text style={{ fontSize: 13, color: '#6b7280' }}>
                      {formatTime(gameweek.startTime)}
                    </Text>
                  </div>
                )}
                
                {gameweek.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <EnvironmentOutlined style={{ color: '#6b7280', fontSize: 12 }} />
                    <Text style={{ fontSize: 13, color: '#6b7280' }}>
                      {gameweek.location}
                    </Text>
                  </div>
                )}
              </div>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* Availability Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>
                Can you attend this fixture?
              </Text>
              
              <Space>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleAvailabilityChange(gameweek.id, true)}
                  loading={loading[gameweek.id]}
                  style={{
                    backgroundColor: '#00b96b',
                    borderColor: '#00b96b',
                    borderRadius: 8,
                    fontWeight: 500
                  }}
                >
                  Available
                </Button>
                
                <Button
                  icon={<CloseOutlined />}
                  onClick={() => handleAvailabilityChange(gameweek.id, false)}
                  loading={loading[gameweek.id]}
                  style={{
                    borderRadius: 8,
                    fontWeight: 500
                  }}
                >
                  Not Available
                </Button>
              </Space>
            </div>
          </Card>
        ))}
      </div>
    </Modal>
  );
};

export default AvailabilityPromptModal;
