// src/components/GameweekList.jsx
import React from "react";
import {
  List,
  Collapse,
  Input,
  Space,
  Dropdown,
  Menu,
  Typography,
  Tooltip,
  Button,
} from "antd";
import {
  PlusOutlined,
  CheckCircleOutlined,
  EllipsisOutlined,
  TrophyTwoTone,
  CloseOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import useStore from "../useStore";

const { Panel } = Collapse;
const { Title } = Typography;

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
  const { openGameweek, setOpenGameweek } = useStore();

  const handleCollapseChange = (keys) => {
    const [clicked] = keys;
    const nextOpen = openGameweek === clicked ? null : clicked;
    if (nextOpen) {
      fetchAvailability(nextOpen);
      fetchAssignments(nextOpen);
      fetchTeams(nextOpen);
      checkVotingStatus(nextOpen);
    }
    setOpenGameweek(nextOpen);
  };

  return (
    <List
      style={{ maxHeight: "75vh", overflowY: "auto", width: "100%" }}
      dataSource={sortedGameweeks}
      renderItem={(gw) => {
        const {
          id,
          date,
          startTime,
          maxPlayers,
          gameResult,
          playerOfTheMatch,
          votingCloseTime,
        } = gw;
        const { teamA = [], teamB = [] } = teams[id] || {};

        // Build menu items conditionally
        const menuItems = [];
        menuItems.push(
          !gameResult && <Menu.Item key="override" onClick={() => showManualAssignmentModal(id)}>
            Override Assignments
          </Menu.Item>
        );
        if (isAdmin) {
          menuItems.push(
            <Menu.Item key="delete" danger icon={<DeleteOutlined />} onClick={() => deleteGameweek(id)}>
              Delete Gameweek
            </Menu.Item>
          );
        }

        return (
          <List.Item style={{ padding: 0, width: "100%" }}>
            <Collapse
              activeKey={openGameweek ? [openGameweek] : []}
              onChange={handleCollapseChange}
              style={{ width: "100%" }}
            >
              <Panel
                key={id}
                header={
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <Space size="large">
                      <div style={{ minWidth: '100px', maxWidth: '100px', textAlign: 'right' }}>{formatDate(date)}</div>
                      <small>{startTime}</small>
                      {gameResult && <div style={{ background: 'white', display: 'flex', padding: 2, width: '100px', justifyContent: 'space-around' }}><div style={{ minWidth: '20px', background: '#00b96b' }}>{gameResult['teamA_score']}</div><div>-</div><div style={{ minWidth: '20px', background: '#00b96b' }}>{gameResult['teamB_score']}</div></div>}
                    </Space>
                  </div>
                }
              >
                {gameResult ? (
                  <div
                    style={{
                      padding: 12,
                      background: "rgba(242,242,242,0.5)",
                      borderRadius: 8,
                      marginBottom: 12,
                      position: 'relative',
                    }}
                  >
                    {maxPlayers != null && (
                      <small style={{ position: 'absolute', top: 2, left: 2 }}>
                        Max: {maxPlayers}
                      </small>
                    )}
                    {playerOfTheMatch?.length > 0 && (
                      <div style={{ marginBottom: 8, marginTop: 8 }}>
                        <TrophyTwoTone
                          twoToneColor="#00b96b"
                          style={{ marginRight: 8, fontSize: 20 }}
                        />
                        <strong>Player(s) of the Match:</strong> {playerOfTheMatch.join(", ")}
                      </div>
                    )}
                    <div>
                      {isVotingOpen(gw) ? (
                        <small>
                          <strong>Voting closes:</strong> {formatVotingCloseTime(votingCloseTime)}
                        </small>
                      ) : (
                        <strong>Voting closed</strong>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <Input.Search
                      placeholder="Search players to mark available"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ marginBottom: 12 }}
                    />
                    <div
                      style={{
                        maxHeight: 180,
                        overflowY: "auto",
                        border: "1px solid #eee",
                        borderRadius: 4,
                        padding: 8,
                        marginBottom: 16,
                      }}
                    >
                      {filteredPlayers(id).map((p) => {
                        const avail = availability[id]?.[p.id] ?? false;
                        return (
                          <div
                            key={p.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 4,
                            }}
                          >
                            <span>
                              {p.name}{" "}
                              {p.auth0Id && (
                                <Tooltip title="Linked user">
                                  <CheckCircleOutlined
                                    style={{ color: "green", marginLeft: 4 }}
                                  />
                                </Tooltip>
                              )}
                            </span>
                            <Button
                              size="small"
                              shape="circle"
                              icon={avail ? <CloseOutlined /> : <PlusOutlined />}
                              onClick={() =>
                                avail
                                  ? removePlayerAvailability(p.id, id)
                                  : setPlayerAvailability(p.id, id, true)
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <Title level={5}>Team A</Title>
                    <ul>
                      {teamA.map((p) => (
                        <li key={p.id}>{p.name}</li>
                      ))}
                    </ul>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Title level={5}>Team B</Title>
                    <ul>
                      {teamB.map((p) => (
                        <li key={p.id}>{p.name}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Dropdown overlay={<Menu>{menuItems}</Menu>} trigger={["click"]}>
                  <Button size="small" icon={<EllipsisOutlined />} />
                </Dropdown>
              </Panel>
            </Collapse>
          </List.Item>
        );
      }}
    />
  );
};

export default GameweekList;
