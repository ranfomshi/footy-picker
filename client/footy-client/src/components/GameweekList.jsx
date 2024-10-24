import React, {useEffect} from "react";
import {
  List,
  Button,
  Popconfirm,
  Collapse,
  Input,
  Typography,
  Tooltip,
  Space,
  Dropdown,
  Menu,
} from "antd";
import {
  DeleteOutlined,
  CloseOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  EllipsisOutlined,
  TrophyTwoTone
} from "@ant-design/icons";
import useStore from "../useStore";

const { Title } = Typography;
const { Panel } = Collapse;

const GameweekList = ({
    sortedGameweeks,
    recordedResults,
    teams,
    formatTime,
    availability,
    playerAssignments,
    fetchAvailability,
    fetchAssignments,
    fetchTeams,
    filteredPlayers,
    checkVotingStatus,
    setPlayerAvailability,
    removePlayerAvailability,
    castVote,
    currentUserId,
    hasVoted,
    isVotingOpen,
    showManualAssignmentModal,
    showResultModal,
    deleteGameweek,
    searchTerm
  }) => {
    
    const { openGameweek, setOpenGameweek } = useStore(); // Zustand store for open gameweek

    
    useEffect(() => {
        if (openGameweek) {
          setOpenGameweek(openGameweek);
        }
      }, [openGameweek, setOpenGameweek]);
    
      const handleCollapseChange = (gameweekId) => {
        setOpenGameweek(gameweekId === openGameweek ? null : gameweekId);
      };
    
    return(
<List
        style={{ maxHeight: "75vh", overflowY: "scroll", width: "100%" }}
        className="scroll-list"
        itemLayout="horizontal"
        dataSource={sortedGameweeks}
        renderItem={(gameweek) => {
          const resultExists = !!recordedResults[gameweek.id];
          const result = recordedResults[gameweek.id];
          return (
            <List.Item style={{ width: "100%", padding: "8px 0px 0px 0px" }}>
              <Collapse
               activeKey={openGameweek === gameweek.id ? gameweek.id : null}
              
                style={{ width: "100%" }}
                onChange={() => {handleCollapseChange(gameweek.id)
                  fetchAvailability(gameweek.id);
                  fetchAssignments(gameweek.id);
                  fetchTeams(gameweek.id);
                  checkVotingStatus(gameweek.id); // Check voting status for the gameweek
                }}
              >
                <Panel
                  header={
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        width: "100%",
                      }}
                    >
                      <span>{`${new Date(gameweek.date).toLocaleDateString(
                        "en-GB"
                      )}`}</span>
                      {resultExists && (
                        <span
                          style={{ display: "flex", alignItems: "baseline" }}
                        >
                          Team A{" "}
                          <div
                            style={{
                              background: "#00b96b",
                              borderRadius: "3px",
                              color: "white",
                              margin: "0 5px",
                              padding: "0 2px",
                              width: 50,
                            }}
                          >
                            <strong>{result.teamA_score}</strong> -{" "}
                            <strong>{result.teamB_score}</strong>
                          </div>{" "}
                          Team B
                        </span>
                      )}
                    </div>
                  }
                  key={gameweek.id}
                >
                  {resultExists && (
                    <div style={{padding: 8, background:'rgba(242, 242, 242, 1)', borderRadius:8, margin:8, marginRight:8, flex:1 }}>
                      {gameweek.playerOfTheMatch && (
                        <div style={{ marginBottom: 8 }}>
                          <TrophyTwoTone twoToneColor={'#00b96b'} style={{margin:8, fontSize:20}}/>
                          <strong>Player(s) of the Match:</strong>{" "}
                          {Array.isArray(gameweek.playerOfTheMatch)
                            ? gameweek.playerOfTheMatch.join(", ")
                            : gameweek.playerOfTheMatch}
                        </div>
                      )}
                      <div>
                        <span>
                          {isVotingOpen(gameweek) ? (
                            <>
                              <small><strong>Voting closes:</strong>
                              {`${formatTime(gameweek.votingCloseTime)}`}</small>
                            </>
                          ) : (
                            <strong>Voting closed</strong>
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                  {!resultExists && (
                    <div>
                      <Input.Search
                        placeholder="Search players"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ marginBottom: 8 }}
                      />
                      <div
                        style={{
                          maxHeight: "200px",
                          overflowY: "scroll",
                          borderBottom: "1px solid lightGray",
                          marginBottom: 4,
                        }}
                      >
                        {filteredPlayers(gameweek.id).map((player) => (
                          <div
                            key={player.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 0,
                            }}
                          >
                            <span>
                              {player.name}{" "}
                              {player.auth0Id && (
                                <Tooltip title="Player linked to user">
                                  <CheckCircleOutlined
                                    style={{ color: "green", marginLeft: 5 }}
                                  />
                                </Tooltip>
                              )}
                            </span>
                            <Button
                              type="default"
                              size="small"
                              style={{ marginRight: 8 }}
                              icon={
                                <PlusOutlined
                                  onClick={() => {
                                    setPlayerAvailability(
                                      player.id,
                                      gameweek.id,
                                      true
                                    );
                                    setAvailability((prevAvailability) => ({
                                      ...prevAvailability,
                                      [gameweek.id]: {
                                        ...prevAvailability[gameweek.id],
                                        [player.id]: true,
                                      },
                                    }));
                                  }}
                                  style={{ color: "green", cursor: "pointer" }}
                                />
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {teams[gameweek.id] && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{padding: 8, background:'rgba(242, 242, 242, 1)', borderRadius:8, margin:8, marginRight:16, flex:1 }}>
                        <Title style={{ marginTop: 0 }} level={5} marginTop={0}>
                          Team A
                        </Title>
                        <ul style={{ margin: 0, padding: 0 }}>
                          {teams[gameweek.id].teamA.map((player) => (
                            <li
                              style={{
                                listStyle: "none",
                                display: "flex",
                                justifyContent: "flex-start",
                                gap: 4,
                              }}
                              key={player.id}
                            >
                              {!resultExists && (
                                <Button
                                  size="small"
                                  icon={
                                    <CloseOutlined
                                      onClick={() => {
                                        removePlayerAvailability(
                                          player.id,
                                          gameweek.id
                                        );
                                        setAvailability((prevAvailability) => ({
                                          ...prevAvailability,
                                          [gameweek.id]: {
                                            ...prevAvailability[gameweek.id],
                                            [player.id]: false,
                                          },
                                        }));
                                      }}
                                      style={{
                                        color: "red",
                                        cursor: "pointer",
                                      }}
                                    />
                                  }
                                />
                              )}
                              <span>
                              {teams[gameweek.id] &&
                                currentUserId &&
                                teams[gameweek.id].teamA
                                  .concat(teams[gameweek.id].teamB)
                                  .some(
                                    (player) => player.id === currentUserId
                                  ) &&
                                isVotingOpen(gameweek) && // Check if voting is open
                                !hasVoted[gameweek.id] && // Check if user hasn't voted yet
                                player.id !== currentUserId && ( // Hide vote button for yourself
                                  <Button
                                    type="primary"
                                    className="voteBtn"
                                    style={{marginRight: 4}}
                                    size="small"
                                    onClick={() =>
                                      castVote(
                                        gameweek.id,
                                        player.id,
                                        currentUserId
                                      )
                                    }
                                  >
                                    Vote
                                  </Button>
                                )}
                                {player.name}{" "}
                                {player.auth0Id && (
                                  <Tooltip title="Player linked to user">
                                    <CheckCircleOutlined
                                      style={{
                                        color: "green",
                                        marginLeft: 5,
                                      }}
                                    />
                                  </Tooltip>
                                )}
                              </span>
                          
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div style={{padding: 8, background:'rgba(242, 242, 242, 1)', borderRadius:8, margin:8, flex:1 }}>
                        <Title style={{ marginTop: 0 }} level={5}>
                          Team B
                        </Title>
                        <ul style={{ margin: 0, padding: 0 }}>
                          {teams[gameweek.id].teamB.map((player) => (
                            <li
                              style={{
                                listStyle: "none",
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 4,
                              }}
                              key={player.id}
                            >
                              <span>
                                {player.name}{" "}
                                {player.auth0Id && (
                                  <Tooltip title="Player linked to user">
                                    <CheckCircleOutlined
                                      style={{
                                        color: "green",
                                        marginLeft: 5,
                                      }}
                                    />
                                  </Tooltip>
                                )}
                              </span>
                              {!resultExists && (
                                <Button
                                  size="small"
                                  icon={
                                    <CloseOutlined
                                      onClick={() => {
                                        removePlayerAvailability(
                                          player.id,
                                          gameweek.id
                                        );
                                        setAvailability((prevAvailability) => ({
                                          ...prevAvailability,
                                          [gameweek.id]: {
                                            ...prevAvailability[gameweek.id],
                                            [player.id]: false,
                                          },
                                        }));
                                      }}
                                      style={{
                                        color: "red",
                                        cursor: "pointer",
                                      }}
                                    />
                                  }
                                />
                              )}
                              {teams[gameweek.id] &&
                                currentUserId &&
                                teams[gameweek.id].teamA
                                  .concat(teams[gameweek.id].teamB)
                                  .some(
                                    (player) => player.id === currentUserId
                                  ) &&
                                isVotingOpen(gameweek) && // Check if voting is open
                                !hasVoted[gameweek.id] && // Check if user hasn't voted yet
                                player.id !== currentUserId && ( // Hide vote button for yourself
                                  <Button
                                    type="primary"
                                    className="voteBtn"
                                    size="small"
                                    onClick={() =>
                                      castVote(
                                        gameweek.id,
                                        player.id,
                                        currentUserId
                                      )
                                    }
                                  >
                                    Vote
                                  </Button>
                                )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 16,
                    }}
                  >
                    <Popconfirm
                      title="Are you sure you want to delete this gameweek?"
                      onConfirm={() => deleteGameweek(gameweek.id)}
                      okText="Yes"
                      cancelText="No"
                      disabled={resultExists}
                    >
                      <Button
                        size="small"
                        type="primary"
                        danger
                        disabled={resultExists}
                      >
                        <DeleteOutlined />
                      </Button>
                    </Popconfirm>
                    <Space>
                      <Dropdown
                        overlay={
                          <Menu>
                            <Menu.Item
                              disabled={resultExists}
                              onClick={() =>
                                showManualAssignmentModal(gameweek.id)
                              }
                            >
                              Override
                            </Menu.Item>
                          </Menu>
                        }
                        trigger={["click"]}
                      >
                        <Button
                          icon={<EllipsisOutlined disabled={resultExists} />}
                        />
                      </Dropdown>
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => showResultModal(gameweek.id)}
                        disabled={resultExists}
                      >
                        {resultExists
                          ? "Result Recorded"
                          : "Record Game Result"}
                      </Button>
                    </Space>
                  </div>
                </Panel>
              </Collapse>
            </List.Item>
          );
        }}
      />)

    }

export default GameweekList;