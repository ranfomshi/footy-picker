import React from "react";
import { Card, Row, Col, Typography, Divider, List, Statistic, Avatar, Space } from "antd";
import { TrophyOutlined, TeamOutlined, MinusCircleOutlined, PlusCircleOutlined, UserOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

const PlayerDetails = ({ player, onClose }) => {
  return (
    <div>
      <Row gutter={[16, 16]}>
        {/* Basic Stats with Icons and Background Colors */}
        <Col span={8}>
          <Card
            bordered={false}
            style={{
              textAlign: 'center',
              background: '#e6f7ff',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
            }}
          >
            <Statistic
              title={<Text style={{ color: 'gray', fontSize: 'small' }}>Wins</Text>}
              value={player.wins}
              valueStyle={{ fontSize: '1.5rem', color: '#3f8600' }}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card
            bordered={false}
            style={{
              textAlign: 'center',
              background: '#f0f5ff',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
            }}
          >
            <Statistic
              title={<Text style={{ color: 'gray', fontSize: 'small' }}>Draws</Text>}
              value={player.draws}
              valueStyle={{ fontSize: '1.5rem', color: '#1890ff' }}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card
            bordered={false}
            style={{
              textAlign: 'center',
              background: '#fff1f0',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
            }}
          >
            <Statistic
              title={<Text style={{ color: 'gray', fontSize: 'small' }}>Losses</Text>}
              value={player.losses}
              valueStyle={{ fontSize: '1.5rem', color: '#cf1322' }}
              prefix={<MinusCircleOutlined />}
            />
          </Card>
        </Col>

        {/* Team Goals Stats with Background Colors */}
        <Col span={8}>
          <Card
            bordered={false}
            style={{
              textAlign: 'center',
              background: '#f6ffed',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
            }}
          >
            <Statistic
              title={<Text style={{ color: 'gray', fontSize: 'small' }}>Team Goals +</Text>}
              value={player.goalsFor}
              valueStyle={{ fontSize: '1.5rem', color: '#52c41a' }}
              prefix={<PlusCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card
            bordered={false}
            style={{
              textAlign: 'center',
              background: '#fff7e6',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
            }}
          >
            <Statistic
              title={<Text style={{ color: 'gray', fontSize: 'small' }}>Team Goals -</Text>}
              value={player.goalsAgainst}
              valueStyle={{ fontSize: '1.5rem', color: '#f5222d' }}
              prefix={<MinusCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card
            bordered={false}
            style={{
              textAlign: 'center',
              background: '#f9f0ff',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
            }}
          >
            <Statistic
              title={<Text style={{ color: 'gray', fontSize: 'small' }}>GD +/-</Text>}
              value={player.goalsFor - player.goalsAgainst}
              valueStyle={{
                fontSize: '1.5rem',
                color: player.goalsFor - player.goalsAgainst >= 0 ? '#3f8600' : '#cf1322',
              }}
            />
          </Card>
        </Col>

        {/* Join Date with Background Color */}
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
              title={<Text style={{ color: 'gray', fontSize: 'small' }}>Joined</Text>}
              value={new Date(player.createdAt).toLocaleDateString()}
              valueStyle={{ fontSize: '1rem', color: '#595959' }}
            />
          </Card>
        </Col>

        {/* Favorite Teammates Section */}
        {player.favoriteTeammates && player.favoriteTeammates.length > 0 && (
          <Col span={24}>
            <Divider />
            {player.favoriteTeammates.length === 1 ? (<>
              <Title level={4} style={{ color: '#00b96b' }}>Favorite Teammate</Title>
              <Title level={5} style={{ color: '#333' }}>Stats when Playing Together</Title>
              </>
            ) : (
              <>
              <Title level={4} style={{ color: '#00b96b' }}>Favorite Teammates</Title>
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
                        title={<Text strong style={{ fontSize: '1.2rem' }}>{teammate.name}</Text>}
                        description={
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text>Wins: <strong>{teammate.reason.winsTogether}</strong></Text>
                            <Text>Points: <strong>{teammate.reason.pointsTogether}</strong></Text>
                            <Text>Goals: <strong>{teammate.reason.goalsForTogether}</strong></Text>
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
