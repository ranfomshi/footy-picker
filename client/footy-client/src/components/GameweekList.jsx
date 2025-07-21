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
  Skeleton,
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
  showVotePlayerModal,
  showRecordResultModal,
  deleteGameweek,
  isAdmin,
  hasVoted,
  isVotingOpen,
  formatDate,
  formatVotingCloseTime,
  searchTerm,
  setSearchTerm,
  playersLoading = false,
  teamsLoading = {},
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

  // Helper function to create short date format
  const formatShortDate = (iso) => {
    const date = new Date(iso);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short"
    });
  };

  // Helper function to format time without seconds
  const formatTime = (timeString) => {
    if (!timeString) return '';
    // If time includes seconds (HH:MM:SS), remove them
    return timeString.length > 5 ? timeString.slice(0, 5) : timeString;
  };

  return (
    <div>
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
            <Menu.Item key="record" onClick={(e) => { e.domEvent.stopPropagation(); showRecordResultModal && showRecordResultModal(id); }}>
              Record Result
            </Menu.Item>
          );
          if (isAdmin) {
            menuItems.push(
              <Menu.Item key="override" onClick={(e) => { e.domEvent.stopPropagation(); showManualAssignmentModal(id); }}>
                Override Assignments
              </Menu.Item>
            );
          }
        }
        if (isAdmin) {
          menuItems.push(
            <Menu.Item key="delete" danger icon={<DeleteOutlined />} onClick={(e) => { e.domEvent.stopPropagation(); deleteGameweek(id); }}>
              Delete Fixture
            </Menu.Item>
          );
        }

        return (
          <Card
            key={id}
            data-gameweek-id={id}
            style={{
              borderRadius: 12,
              boxShadow: gameResult
                ? '0 4px 12px rgba(0, 185, 107, 0.15)'
                : '0 2px 8px rgba(0, 0, 0, 0.08)',
              padding: 0,
              marginBottom: 8,
              background: '#ffffff',
              border: gameResult
                ? '1px solid rgba(0, 185, 107, 0.2)'
                : '1px solid rgba(0, 0, 0, 0.06)',
              overflow: 'hidden',
              transition: 'all 0.2s ease'
            }}
            bodyStyle={{ padding: 0 }}
          >
            {/* Header */}
            <div
              style={{
                background: gameResult
                  ? 'linear-gradient(135deg, #e6fffb 0%, #f0fffc 100%)'
                  : 'linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%)',
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                borderBottom: gameResult
                  ? '1px solid rgba(0, 185, 107, 0.1)'
                  : '1px solid rgba(0, 0, 0, 0.06)',
                minHeight: 60
              }}
              onClick={() => handleCardClick(id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Main date - prominent */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text strong style={{
                    fontSize: 16,
                    color: gameResult ? '#00b96b' : '#1f2937',
                    fontWeight: 600
                  }}>
                    {formatShortDate(date)}
                  </Text>
                </div>

                {/* Secondary info - compact and clean */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <ClockCircleOutlined style={{ color: '#6b7280', fontSize: 12 }} />
                    <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {formatTime(startTime)}
                    </Text>
                  </div>

                  {location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <EnvironmentOutlined style={{ color: '#6b7280', fontSize: 12 }} />
                      <Tooltip title={location.length > 15 ? location : null}>
                        <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
                          {truncateLocation(location, 15)}
                        </Text>
                      </Tooltip>
                    </div>
                  )}

                  {maxPlayers && !gameResult && (
                    <div style={{
                      background: availablePlayersCount >= maxPlayers
                        ? 'rgba(0, 185, 107, 0.1)'
                        : 'rgba(107, 114, 128, 0.1)',
                      color: availablePlayersCount >= maxPlayers
                        ? '#00b96b'
                        : '#6b7280',
                      padding: '2px 6px',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3
                    }}>
                      <UserOutlined style={{ fontSize: 9 }} />
                      {availablePlayersCount}/{maxPlayers}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Game result - modern pill design */}
                {gameResult && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'linear-gradient(135deg, #00b96b 0%, #52c41a 100%)',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    boxShadow: '0 2px 4px rgba(0, 185, 107, 0.2)'
                  }}>
                    <span style={{ minWidth: 14, textAlign: 'center' }}>{gameResult.teamA_score}</span>
                    <span style={{ margin: '0 6px', fontSize: 11 }}>-</span>
                    <span style={{ minWidth: 14, textAlign: 'center' }}>{gameResult.teamB_score}</span>
                  </div>
                )}

                {/* Available players indicator */}
                {!gameResult && availablePlayersCount >= maxPlayers && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'rgba(0, 185, 107, 0.1)',
                    color: '#00b96b',
                    padding: '4px 8px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 500
                  }}>
                    <CheckCircleOutlined style={{ fontSize: 10 }} />
                    Ready
                  </div>
                )}

                {/* Expand/collapse indicator */}
                <div style={{
                  color: '#6b7280',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24
                }}>
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
              <div style={{ padding: '8px 8px', position: 'relative' }}>
                {/* Actions Menu - Positioned Absolutely */}
                {menuItems.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    zIndex: 2
                  }}>
                    <Dropdown
                      overlay={<Menu>{menuItems}</Menu>}
                      trigger={['click']}
                      placement="bottomRight"
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<EllipsisOutlined />}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          color: '#6b7280',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      />
                    </Dropdown>
                  </div>
                )}

                {gameResult ? (
                  // Game Results View
                  <>
                    {/* Consolidated Results & Voting Section */}
                    <div style={{
                      marginBottom: 20,
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: '1px solid rgba(0, 0, 0, 0.06)',
                      background: '#ffffff'
                    }}>
                      {/* Player of the Match */}
                      {playerOfTheMatch?.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <div style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: '#00b96b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <TrophyTwoTone twoToneColor={["#ffffff", "#ffffff"]} style={{ fontSize: 12 }} />
                          </div>
                          <Text strong style={{ color: '#374151', fontSize: 13 }}>
                            Player of the Match: <span style={{ color: '#00b96b' }}>{playerOfTheMatch.join(", ")}</span>
                          </Text>
                        </div>
                      )}

                      {/* Voting Status Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <ClockCircleOutlined style={{
                            color: isVotingOpen(gw) ? '#52c41a' : '#6b7280',
                            fontSize: 12
                          }} />
                          <Text style={{
                            fontSize: 11,
                            color: isVotingOpen(gw) ? '#52c41a' : '#6b7280'
                          }}>
                            {isVotingOpen(gw) ? (
                              <>Closes: {formatVotingCloseTime(votingCloseTime)}</>
                            ) : (
                              <>Voting closed</>
                            )}
                          </Text>
                          {hasVoted[id] && (
                            <div style={{
                              color: '#6b7280',
                              fontSize: 11,
                              marginLeft: 8,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3
                            }}>
                              <CheckCircleOutlined style={{ fontSize: 10 }} />
                              Voted
                            </div>
                          )}
                        </div>

                        {isVotingOpen(gw) && !hasVoted[id] && (
                          <Button
                            type="primary"
                            size="small"
                            icon={<TrophyTwoTone twoToneColor={["#ffffff", "#ffffff"]} />}
                            onClick={() => showVotePlayerModal && showVotePlayerModal(id)}
                            style={{
                              backgroundColor: '#00b96b',
                              borderColor: '#00b96b',
                              fontSize: 11,
                              height: 26,
                              borderRadius: 6,
                              fontWeight: 500,
                              padding: '0 8px'
                            }}
                          >
                            Vote
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  // Active Game Management
                  <>
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ marginBottom: 16 }}>
                        <Text strong style={{ fontSize: 14, color: '#374151', marginBottom: 8, display: 'block' }}>
                          Mark Players Available
                        </Text>
                        <Input.Search
                          placeholder="Search players..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          style={{
                            borderRadius: 8,
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                          }}
                          size="middle"
                        />
                      </div>

                      <div style={{
                        maxHeight: 240,
                        overflowY: 'auto',
                        border: '1px solid rgba(0, 0, 0, 0.06)',
                        borderRadius: 12,
                        background: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                      }}>
                        {playersLoading ? (
                          <div style={{ padding: '16px' }}>
                            {Array.from({ length: 3 }).map((_, i) => (
                              <div key={i} style={{ marginBottom: i < 2 ? '12px' : 0 }}>
                                <Skeleton.Input
                                  active
                                  size="small"
                                  style={{ width: '100%', height: '40px' }}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <>
                            {filteredPlayers(id).map((p, index) => {
                              const avail = availability[id]?.[p.id] ?? false;
                              const isLast = index === filteredPlayers(id).length - 1;
                              return (
                                <div
                                  key={p.id}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 16px',
                                    borderBottom: isLast ? 'none' : '1px solid rgba(0, 0, 0, 0.04)',
                                    transition: 'background-color 0.2s ease',
                                    cursor: 'pointer'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!avail) {
                                      e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.02)';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexDirection: 'row', flexWrap: 'nowrap' }}>
                                    <PlayerAvatar player={p} size={32} />

                                    <Text style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
                                      {p.name}

                                    </Text> {p.auth0Id && (
                                      <div style={{ marginTop: 2 }}>
                                        <Tooltip title="Linked user account">
                                          <CheckCircleOutlined
                                            style={{
                                              fontSize: 12,
                                              color: '#00b96b',
                                              cursor: 'help'
                                            }}
                                          />
                                        </Tooltip>
                                      </div>
                                    )}

                                  </div>
                                  <Button
                                    size="middle"
                                    type={avail ? 'primary' : 'default'}
                                    shape="round"
                                    icon={avail ? <CheckCircleOutlined /> : <PlusOutlined />}
                                    onClick={() =>
                                      avail
                                        ? removePlayerAvailability(p.id, id)
                                        : setPlayerAvailability(p.id, id, true)
                                    }
                                    style={{
                                      backgroundColor: avail ? '#00b96b' : 'transparent',
                                      borderColor: avail ? '#00b96b' : 'rgba(0, 0, 0, 0.15)',
                                      color: avail ? 'white' : '#6b7280',
                                      fontWeight: 500,
                                      minWidth: 80,
                                      boxShadow: avail ? '0 2px 4px rgba(0, 185, 107, 0.2)' : 'none'
                                    }}
                                  >
                                    {avail ? 'Available' : 'Add'}
                                  </Button>
                                </div>
                              );
                            })}
                            {filteredPlayers(id).length === 0 && !playersLoading && (
                              <div style={{
                                padding: '32px 16px',
                                textAlign: 'center',
                                color: '#9ca3af'
                              }}>
                                <UserOutlined style={{ fontSize: 24, marginBottom: 8, opacity: 0.5 }} />
                                <div style={{ fontSize: 14 }}>No players found</div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Team Display */}
                <div style={{ marginTop: 12 }}>

                  <Row gutter={16}>
                    <Col span={12}>
                      <div style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
                        padding: '16px 18px',
                        borderRadius: 12,
                        border: `2px solid ${teamAColor}20`,
                        borderLeftColor: teamAColor,
                        borderLeftWidth: 4,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${teamAColor} 0%, ${teamAColor}80 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <TeamOutlined style={{ color: 'white', fontSize: 14 }} />
                          </div>
                          <div>
                            <Text strong style={{ color: teamAColor, fontSize: 14 }}>Team A</Text>

                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {(playersLoading || teamsLoading[id]) ? (
                            // Show skeleton loaders when players or teams are loading
                            Array.from({ length: 2 }).map((_, i) => (
                              <div key={i} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '6px 8px',
                                borderRadius: 8,
                                background: 'rgba(255, 255, 255, 0.6)'
                              }}>
                                <Skeleton.Avatar active size={24} />
                                <Skeleton.Input active size="small" style={{ width: 80, height: 16 }} />
                              </div>
                            ))
                          ) : (
                            <>
                              {teamA.sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
                                <div key={p.id} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  padding: '6px 8px',
                                  borderRadius: 8,
                                  background: 'rgba(255, 255, 255, 0.6)'
                                }}>
                                  <PlayerAvatar player={p} size={24} />
                                  <Text style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{p.name}</Text>
                                </div>
                              ))}
                              {teamA.length === 0 && (
                                <div style={{
                                  padding: '16px 8px',
                                  textAlign: 'center',
                                  color: '#9ca3af',
                                  fontSize: 12,
                                  fontStyle: 'italic',
                                  border: '1px dashed #e5e7eb',
                                  borderRadius: 8,
                                  background: 'rgba(255, 255, 255, 0.4)'
                                }}>
                                  No players assigned
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </Col>

                    <Col span={12}>
                      <div style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
                        padding: '16px 18px',
                        borderRadius: 12,
                        border: `2px solid ${teamBColor}20`,
                        borderLeftColor: teamBColor,
                        borderLeftWidth: 4,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${teamBColor} 0%, ${teamBColor}80 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <TeamOutlined style={{ color: 'white', fontSize: 14 }} />
                          </div>
                          <div>
                            <Text strong style={{ color: teamBColor, fontSize: 14 }}>Team B</Text>

                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {(playersLoading || teamsLoading[id]) ? (
                            // Show skeleton loaders when players or teams are loading
                            Array.from({ length: 2 }).map((_, i) => (
                              <div key={i} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '6px 8px',
                                borderRadius: 8,
                                background: 'rgba(255, 255, 255, 0.6)'
                              }}>
                                <Skeleton.Avatar active size={24} />
                                <Skeleton.Input active size="small" style={{ width: 80, height: 16 }} />
                              </div>
                            ))
                          ) : (
                            <>
                              {teamB.sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
                                <div key={p.id} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                  padding: '6px 8px',
                                  borderRadius: 8,
                                  background: 'rgba(255, 255, 255, 0.6)'
                                }}>
                                  <PlayerAvatar player={p} size={24} />
                                  <Text style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{p.name}</Text>
                                </div>
                              ))}
                              {teamB.length === 0 && (
                                <div style={{
                                  padding: '16px 8px',
                                  textAlign: 'center',
                                  color: '#9ca3af',
                                  fontSize: 12,
                                  fontStyle: 'italic',
                                  border: '1px dashed #e5e7eb',
                                  borderRadius: 8,
                                  background: 'rgba(255, 255, 255, 0.4)'
                                }}>
                                  No players assigned
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </Col>
                  </Row>
                </div>

                {/* Max Players Info */}
                {maxPlayers && (
                  <div style={{ marginTop: 20, textAlign: 'center' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'linear-gradient(135deg, #e6f7ff 0%, #f0f9ff 100%)',
                      color: '#1890ff',
                      padding: '8px 16px',
                      borderRadius: 20,
                      border: '1px solid rgba(24, 144, 255, 0.2)',
                      fontSize: 12,
                      fontWeight: 500
                    }}>
                      <UsergroupAddOutlined style={{ fontSize: 12 }} />
                      Maximum {maxPlayers} players
                    </div>
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
