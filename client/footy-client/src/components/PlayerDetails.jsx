import React from "react";
import { Card, Row, Col, Typography, Divider, List, Statistic, Avatar, Tooltip, Modal, Button } from "antd";
import { TrophyOutlined, TeamOutlined, MinusCircleOutlined, PlusCircleOutlined, UserOutlined, InfoCircleOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

const PlayerDetails = ({ player, onClose }) => {
  const coreColor = '#00b96b'; // Core color

// Modal for explanation
const showExplanation = () => {
  Modal.confirm({
    cancelButtonProps: {display: 'none'},
    hideclose: true,
    hideCancel: true,
    title: <Text style={{ color: coreColor }}>Explanation of Favorite Teammate</Text>,
    content: (
      <div>
        <p style={{ color: '#333' }}>
          The "Favorite Teammate" is determined based on the following criteria:
        </p>
        <ul style={{ color: '#333' }}>
          <li>
            <Text strong style={{ color: coreColor }}>Minimum Match Requirement:</Text> To be considered, you must have played at least 3 matches with a teammate.
          </li>
          <li>
            <Text strong style={{ color: coreColor }}>Eligibility Check:</Text> The analysis requires at least 2 teammates to have played at least 3 matches with you.
          </li>
          <li>
            <Text strong style={{ color: coreColor }}>Win Rate Calculation:</Text> The win rate is calculated as the number of wins when playing with the teammate divided by the total matches played together.
          </li>
          <li>
            <Text strong style={{ color: coreColor }}>Tiebreakers:</Text> If two or more teammates have the same win rate, the teammate with the highest total wins is considered first. If the win rate and total wins are tied, the final tiebreaker is the highest goal difference when playing together.
          </li>
        </ul>
        <p style={{ color: '#333' }}>
          This system ensures that your favorite teammate represents a consistent and successful partnership.
        </p>
      </div>
    ),
    okButtonProps: {
      style: {
        backgroundColor: coreColor,
        borderColor: coreColor,
        color: '#fff', // White text for contrast
      },
    },
    onOk() {},
  });
};




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
              title={<Text style={{ color: '#007a4a', fontSize: 'small' }}>Wins</Text>}
              value={player.wins}
              valueStyle={{ fontSize: '1.5rem', color: coreColor }}
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
              valueStyle={{ fontSize: '1.5rem', color: '#cf1322' }}
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
              valueStyle={{ fontSize: '1.5rem', color: '#cf1322' }}
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

        {/* Favorite Teammates Section with Core Color and Explanation Icon */}
        {player.favoriteTeammates && player.favoriteTeammates.length > 0 && (
          <Col span={24}>
            <Divider />
            <Row align="middle" justify="space-between">
              <Title level={4} style={{ color: coreColor }}>
                {player.favoriteTeammates.length === 1 ? 'Favorite Teammate' : 'Favorite Teammates'}
              </Title>
              <Tooltip title="Click to see explanation">
                <Button
                  type="link"
                  icon={<InfoCircleOutlined style={{ fontSize: '1.2rem', color: coreColor }} />}
                  onClick={showExplanation}
                />
              </Tooltip>
            </Row>
            <Title level={5} style={{ color: '#333' }}>Stats when Playing Together</Title>
            <div className="scroll-list" style={{ maxHeight: 250, overflowY: 'auto', paddingRight: 8 }}>
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
                            <Text>Win Rate: <strong>{teammate.reason.winRate*100}%</strong></Text>
                            <Text>Matches played: <strong>{teammate.reason.matchesPlayedTogether}</strong></Text>
                            <Text>Goals +/-: <strong>{teammate.reason.goalDifferenceTogether}</strong></Text>
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
