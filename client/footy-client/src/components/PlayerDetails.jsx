import React from "react";
import { Card, Row, Col, Typography, Divider, List, Statistic, Avatar } from "antd";
import { TrophyOutlined, TeamOutlined, MinusCircleOutlined, PlusCircleOutlined, UserOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

const PlayerDetails = ({ player, onClose }) => {
  const coreColor = '#00b96b'; // Core color

  // Helper function to round points
  const formatPoints = (points) => points.toFixed(1); // Rounds to 1 decimal place

  // Helper function to calculate goal difference
  const calculateGoalDifference = (goalsFor, goalsAgainst) => goalsFor - goalsAgainst;

  return (
    <div>
      <Row gutter={[16, 16]}>
        {/* Basic Stats with Icons and Core Color Integration */}
        <Col span={8}>
          <Card
            bordered={false}
            style={{
              textAlign: 'center',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
            }}
          >
            <Statistic
              title={<Text style={{ color: '#007a4a', fontSize: 'small' }}>Wins</Text>} // Darker green for text
              value={player.wins}
              valueStyle={{ fontSize: '1.5rem', color: coreColor }} // Core green for value
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card
            bordered={false}
            style={{
              textAlign: 'center',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
            }}
          >
            <Statistic
              title={<Text style={{ color: '#007a4a', fontSize: 'small' }}>Draws</Text>}
              value={player.draws}
              valueStyle={{ fontSize: '1.5rem', color: '#ff4d00' }}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card
            bordered={false}
            style={{
              textAlign: 'center',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
            }}
          >
            <Statistic
              title={<Text style={{ color: '#007a4a', fontSize: 'small' }}>Losses</Text>}
              value={player.losses}
              valueStyle={{ fontSize: '1.5rem', color: '#cf1322' }} // Red for losses
              prefix={<MinusCircleOutlined />}
            />
          </Card>
        </Col>

        {/* Team Goals Stats with Core Color */}
        <Col span={8}>
          <Card
            bordered={false}
            style={{
              textAlign: 'center',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
            }}
          >
            <Statistic
              title={<Text style={{ color: '#007a4a', fontSize: 'small' }}>Team Goals +</Text>}
              value={player.goalsFor}
              valueStyle={{ fontSize: '1.5rem', color: coreColor }}
              prefix={<PlusCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card
            bordered={false}
            style={{
              textAlign: 'center',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
            }}
          >
            <Statistic
              title={<Text style={{ color: '#007a4a', fontSize: 'small' }}>Team Goals -</Text>}
              value={player.goalsAgainst}
              valueStyle={{ fontSize: '1.5rem', color: '#cf1322' }} // Red for goals against
              prefix={<MinusCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card
            bordered={false}
            style={{
              textAlign: 'center',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
            }}
          >
            <Statistic
              title={<Text style={{ color: '#007a4a', fontSize: 'small' }}>GD +/-</Text>}
              value={player.goalsFor - player.goalsAgainst}
              valueStyle={{
                fontSize: '1.5rem',
                color: player.goalsFor - player.goalsAgainst >= 0 ? coreColor : '#cf1322',
              }}
            />
          </Card>
        </Col>

        {/* Join Date with Core Color */}
        <Col span={24}>
          <Card
            bordered={false}
            style={{
              textAlign: 'center',
              background: '#fafafa',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
            }}
          >
            <Statistic
              title={<Text style={{ color: '#007a4a', fontSize: 'small' }}>Joined</Text>}
              value={new Date(player.createdAt).toLocaleDateString()}
              valueStyle={{ fontSize: '1rem', color: coreColor }}
            />
          </Card>
        </Col>

        {/* Favorite Teammates Section with Core Color */}
        {player.favoriteTeammates && player.favoriteTeammates.length > 0 && (
          <Col span={24}>
            <Divider />
            {player.favoriteTeammates.length === 1 ? (
              <>
                <Title level={4} style={{ color: coreColor }}>Favorite Teammate</Title>
                <Title level={5} style={{ color: '#333' }}>Stats when Playing Together</Title>
              </>
            ) : (
              <>
                <Title level={4} style={{ color: coreColor }}>Favorite Teammates</Title>
                <Title level={5} style={{ color: '#333' }}>Stats when Playing Together</Title>
              </>
            )}
            <div className="scroll-list" style={{ maxHeight: 250, overflowY: 'auto', paddingRight: 16 }}>
              <List
                itemLayout="horizontal"
                dataSource={player.favoriteTeammates}
                renderItem={(teammate) => (
                  <List.Item>
                    <Card
                      bordered={false}
                      style={{
                        width: '100%',
                        background: '#f0f2f5',
                        borderRadius: 8,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      <List.Item.Meta
                        avatar={<Avatar size={64} icon={<UserOutlined />} />}
                        title={<Text strong style={{ fontSize: '1.2rem', color: coreColor }}>{teammate.name}</Text>}
                        description={
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text>Wins: <strong>{teammate.reason.winsTogether}</strong></Text>
                            <Text>Points: <strong>{formatPoints(teammate.reason.pointsTogether)}</strong></Text> {/* Rounding points */}
                            <Text>Goals +: <strong>{teammate.reason.goalsForTogether}</strong></Text>
                            <Text>Goals -: <strong>{teammate.reason.goalsAgainstTogether}</strong></Text>
                            <Text>+/-: <strong>{calculateGoalDifference(teammate.reason.goalsForTogether, teammate.reason.goalsAgainstTogether)}</strong></Text>
                          </div>
                        }
                      />
                    </Card>
                  </List.Item>
                )}
              />
            </div>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default PlayerDetails;
