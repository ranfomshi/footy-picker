import React from "react";
import {
  Card,
  Input,
  Space,
  Dropdown,
  Menu,
  Typography,
  Tooltip,
  Button,
  Badge,
  Avatar,
  Row,
  Col,
  Divider,
  Tag,
} from "antd";
import {
  PlusOutlined,
  CheckCircleOutlined,
  EllipsisOutlined,
  TrophyTwoTone,
  CloseOutlined,
  DeleteOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
  TeamOutlined,
  ExpandOutlined,
  CompressOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import useStore from "../useStore";
import PlayerAvatar from "./PlayerAvatar";

const { Text, Title } = Typography;

const GameweekList = ({
  sortedGameweeks,
  teams,
  availability,
  fetchAvailability,
  fetchAssignments,
  fetchTeams,
  filteredPlayers,
  checkVotingStatus,
  setPlayerAvailability,
  removePlayerAvailability,
  showManualAssignmentModal,
  deleteGameweek,
  isAdmin,
  hasVoted,
  isVotingOpen,
  formatDate,
  formatVotingCloseTime,
  searchTerm,
  setSearchTerm,
}) => {
  const { openGameweek, setOpenGameweek, teamAColor, teamBColor } = useStore();

  const handleCardClick = (gwId) => {
    const nextOpen = openGameweek === gwId ? null : gwId;
    if (nextOpen) {
      fetchAvailability(nextOpen);
      fetchAssignments(nextOpen);
      fetchTeams(nextOpen);
      checkVotingStatus(nextOpen);
    }
    setOpenGameweek(nextOpen);
  };

  // Helper function to truncate long location names
  const truncateLocation = (location, maxLength = 15) => {
    if (!location) return '';
    if (location.length <= maxLength) return location;
    return location.substring(0, maxLength) + '...';
  };

  return (
    <div style={{ padding: '0 8px' }}>
      {sortedGameweeks.map((gw) => {
        const {
          id,
          date,
          startTime,
          location,
          maxPlayers,
          gameResult,
          playerOfTheMatch,
          votingCloseTime,
        } = gw;
        const { teamA = [], teamB = [] } = teams[id] || {};
        const isExpanded = openGameweek === id;
        const availablePlayersCount = Object.values(availability[id] || {}).filter(Boolean).length;

        // Build menu items conditionally
        const menuItems = [];
        if (!gameResult) {
          menuItems.push(
            <Menu.Item key="override" onClick={() => showManualAssignmentModal(id)}>
              Override Assignments
            </Menu.Item>
          );
        }
        if (isAdmin) {
          menuItems.push(
            <Menu.Item key="delete" danger icon={<DeleteOutlined />} onClick={() => deleteGameweek(id)}>
              Delete Gameweek
            </Menu.Item>
          );
        }

        return (
          <Card
            key={id}
            style={{
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              padding: 0,
              marginBottom: 16,
              background: gameResult ? '#e6fffb' : '#fafafa',
              border: gameResult ? '1px solid #87e8de' : '1px solid #f0f0f0',
            }}
            bodyStyle={{ padding: 0 }}
          >
            {/* Header */}
            <div
              style={{
                background: gameResult ? '#e6fffb' : '#f8f9fa',
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                borderBottom: '1px solid #f0f0f0',
              }}
              onClick={() => handleCardClick(id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Main date - prominent */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CalendarOutlined style={{ color: '#00b96b', fontSize: 14 }} />
                  <Text strong style={{ fontSize: 15 }}>
                    {formatDate(date)}
                  </Text>
                </div>

                {/* Secondary info - smaller and more subtle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 11, color: '#999' }}>
                    {startTime}
                  </Text>

                  {location && (
                    <Tooltip title={location.length > 15 ? location : null}>
                      <Text style={{ fontSize: 11, color: '#999' }}>
                        • {truncateLocation(location, 15)}
                      </Text>
                    </Tooltip>
                  )}

                  {maxPlayers && !gameResult && (
                    <Text style={{ fontSize: 11, color: '#999' }}>
                      • {availablePlayersCount}/{maxPlayers}
                    </Text>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {!gameResult && availablePlayersCount >= maxPlayers && (
                  <div style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#00b96b'
                  }} />
                )}

                {/* Game result - right aligned next to expand icon */}
                {gameResult && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 40,
                    background: '#e6fffb',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#00b96b',
                    border: '1px solid #87e8de',
                    textAlign: 'center'
                  }}>
                    <span style={{ width: 12, textAlign: 'right' }}>{gameResult.teamA_score}</span>
                    <span style={{ margin: '0 2px' }}>-</span>
                    <span style={{ width: 12, textAlign: 'left' }}>{gameResult.teamB_score}</span>
                  </div>
                )}

                {menuItems.length > 0 && (
                  <Dropdown
                    overlay={<Menu>{menuItems}</Menu>}
                    trigger={['click']}
                  >
                    <Button
                      type="text"
                      size="small"
                      icon={<EllipsisOutlined />}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: 24,
                        height: 24,
                        minWidth: 24,
                        color: '#999'
                      }}
                    />
                  </Dropdown>
                )}

                <div style={{ color: '#999', fontSize: 12 }}>
                  {isExpanded ? (
                    <CompressOutlined />
                  ) : (
                    <ExpandOutlined />
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div style={{ padding: 16 }}>
                {gameResult ? (
                  // Game Results View
                  <>
                    {playerOfTheMatch?.length > 0 && (
                      <div style={{
                        marginBottom: 16,
                        padding: '12px 16px',
                        background: '#fff7e6',
                        borderRadius: 8,
                        border: '1px solid #ffd591'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <TrophyTwoTone twoToneColor="#fa8c16" style={{ fontSize: 18 }} />
                          <Text strong style={{ color: '#fa8c16' }}>
                            Player(s) of the Match: {playerOfTheMatch.join(", ")}
                          </Text>
                        </div>
                      </div>
                    )}

                    <div style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 12, color: '#666' }}>
                        {isVotingOpen(gw) ? (
                          <>
                            <strong>Voting closes:</strong> {formatVotingCloseTime(votingCloseTime)}
                          </>
                        ) : (
                          <strong>Voting closed</strong>
                        )}
                      </Text>
                    </div>
                  </>
                ) : (
                  // Active Game Management
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <Input.Search
                        placeholder="Search players to mark available"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ marginBottom: 12 }}
                      />

                      <div style={{
                        maxHeight: 200,
                        overflowY: 'auto',
                        border: '1px solid #f0f0f0',
                        borderRadius: 8,
                        padding: 12,
                        background: '#fff'
                      }}>
                        {filteredPlayers(id).map((p) => {
                          const avail = availability[id]?.[p.id] ?? false;
                          return (
                            <div
                              key={p.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 0',
                                borderBottom: '1px solid #f5f5f5',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <PlayerAvatar player={p} size={24} />
                                <span>
                                  {p.name}
                                  {p.auth0Id && (
                                    <Tooltip title="Linked user">
                                      <CheckCircleOutlined
                                        style={{ color: '#00b96b', marginLeft: 6, fontSize: 14 }}
                                      />
                                    </Tooltip>
                                  )}
                                </span>
                              </div>
                              <Button
                                size="small"
                                type={avail ? 'primary' : 'default'}
                                shape="circle"
                                icon={avail ? <CheckCircleOutlined /> : <PlusOutlined />}
                                onClick={() =>
                                  avail
                                    ? removePlayerAvailability(p.id, id)
                                    : setPlayerAvailability(p.id, id, true)
                                }
                                style={{
                                  backgroundColor: avail ? '#00b96b' : undefined,
                                  borderColor: avail ? '#00b96b' : undefined,
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Team Display */}
                <div style={{ marginTop: 16 }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <div style={{
                        background: '#fff',
                        padding: '12px 16px',
                        borderRadius: 8,
                        border: '1px solid #f0f0f0'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <TeamOutlined style={{ color: teamAColor }} />
                          <Text strong style={{ color: teamAColor }}>Team A</Text>
                          <Badge count={teamA.length} style={{ backgroundColor: teamAColor }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {teamA.map((p) => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <PlayerAvatar player={p} size={20} />
                              <Text style={{ fontSize: 13 }}>{p.name}</Text>
                            </div>
                          ))}
                          {teamA.length === 0 && (
                            <Text style={{ fontSize: 12, color: '#999', fontStyle: 'italic' }}>
                              No players assigned yet
                            </Text>
                          )}
                        </div>
                      </div>
                    </Col>

                    <Col span={12}>
                      <div style={{
                        background: '#fff',
                        padding: '12px 16px',
                        borderRadius: 8,
                        border: '1px solid #f0f0f0'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <TeamOutlined style={{ color: teamBColor }} />
                          <Text strong style={{ color: teamBColor }}>Team B</Text>
                          <Badge count={teamB.length} style={{ backgroundColor: teamBColor }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {teamB.map((p) => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <PlayerAvatar player={p} size={20} />
                              <Text style={{ fontSize: 13 }}>{p.name}</Text>
                            </div>
                          ))}
                          {teamB.length === 0 && (
                            <Text style={{ fontSize: 12, color: '#999', fontStyle: 'italic' }}>
                              No players assigned yet
                            </Text>
                          )}
                        </div>
                      </div>
                    </Col>
                  </Row>
                </div>

                {/* Max Players Info */}
                {maxPlayers && (
                  <div style={{ marginTop: 12, textAlign: 'center' }}>
                    <Tag color="blue" icon={<UsergroupAddOutlined />}>
                      Max Players: {maxPlayers}
                    </Tag>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default GameweekList;
