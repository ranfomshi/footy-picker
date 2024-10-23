import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  List,
  Button,
  DatePicker,
  message,
  Popconfirm,
  Collapse,
  Input,
  Form,
  Modal,
  Typography,
  Tooltip,
  Row,
  Col,
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
import { useAuth0 } from "@auth0/auth0-react";

const { Title } = Typography;
const { Panel } = Collapse;

const GameweekManager = () => {
  const { getAccessTokenSilently } = useAuth0();
  const [gameweeks, setGameweeks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState({});
  const [availability, setAvailability] = useState({});
  const [assignments, setAssignments] = useState({});
  const [form] = Form.useForm();
  const [isAddGameweekModalVisible, setIsAddGameweekModalVisible] =
    useState(false);
  const [isResultModalVisible, setIsResultModalVisible] = useState(false);
  const [manualAssignmentModalVisible, setManualAssignmentModalVisible] =
    useState(false);
  const [resultGameweekId, setResultGameweekId] = useState(null);
  const [recordedResults, setRecordedResults] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGameweekId, setSelectedGameweekId] = useState(null);
  const [playerAssignments, setPlayerAssignments] = useState({});
  const [hasVoted, setHasVoted] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const checkVotingStatus = async (gameweekId) => {
    const token = await getAccessTokenSilently();
    const response = await axios.get(
      `${API_BASE_URL}/has-voted?gameweekId=${gameweekId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    setHasVoted((prevHasVoted) => ({
      ...prevHasVoted,
      [gameweekId]: response.data.hasVoted,
    }));

    setCurrentUserId(response.data.player_id);
  };

  useEffect(() => {
    console.log("Current User ID:", currentUserId); // Add this line for debugging
  }, [currentUserId]);

  const castVote = async (gameweekId, votedPlayerId, currentUserId) => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.post(
        `${API_BASE_URL}/votes`,
        { gameweekId, votedPlayerId, currentUserId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Update the gameweeks state with the updated player of the match
      setGameweeks((prevGameweeks) => ({
        ...prevGameweeks,
        [gameweekId]: response.data,
      }));

      // Update hasVoted state immediately
      setHasVoted((prevHasVoted) => ({
        ...prevHasVoted,
        [gameweekId]: true, // Set to true for this gameweek
      }));

      message.success("Vote cast successfully!");
    } catch (error) {
      console.error("Error casting vote", error);
      message.error("Failed to cast vote");
    }
  };

  const fetchGameweeks = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(`${API_BASE_URL}/gameweeks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const gameweeksData = response.data.reduce((acc, gameweek) => {
        acc[gameweek.id] = gameweek;
        return acc;
      }, {});
      setGameweeks(gameweeksData);
    } catch (error) {
      console.error("Error fetching gameweeks", error);
    }
  };

  const fetchPlayers = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(`${API_BASE_URL}/players`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setPlayers(response.data);
    } catch (error) {
      console.error("Error fetching players", error);
    }
  };

  const fetchTeams = async (gameweekId) => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(
        `${API_BASE_URL}/teamassignments?gameweekId=${gameweekId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const teamA = [];
      const teamB = [];
      response.data.forEach((assignment) => {
        if (assignment.team === "A") {
          teamA.push(
            players.find((player) => player.id === assignment.playerId)
          );
        } else {
          teamB.push(
            players.find((player) => player.id === assignment.playerId)
          );
        }
      });
      setTeams((prevTeams) => ({
        ...prevTeams,
        [gameweekId]: { teamA, teamB },
      }));
      const playerAssignmentsData = response.data.reduce((acc, assignment) => {
        acc[assignment.playerId] = assignment.team;
        return acc;
      }, {});
      setPlayerAssignments(playerAssignmentsData);
    } catch (error) {
      console.error("Error fetching teams", error);
    }
  };

  const fetchAssignments = async (gameweekId) => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(
        `${API_BASE_URL}/teamassignments?gameweekId=${gameweekId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const assignmentData = response.data.reduce((acc, assignment) => {
        acc[assignment.playerId] = assignment.team;
        return acc;
      }, {});
      setAssignments((prevAssignments) => ({
        ...prevAssignments,
        [gameweekId]: assignmentData,
      }));
    } catch (error) {
      console.error("Error fetching assignments", error);
    }
  };

  const fetchAvailability = async (gameweekId) => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(
        `${API_BASE_URL}/availability?gameweekId=${gameweekId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const availabilityData = response.data.reduce((acc, availability) => {
        acc[availability.playerId] = availability.status;
        return acc;
      }, {});
      setAvailability((prevAvailability) => ({
        ...prevAvailability,
        [gameweekId]: availabilityData,
      }));
    } catch (error) {
      console.error("Error fetching availability", error);
    }
  };

  const handleManualTeamAssignment = async (playerId, gameweekId, team) => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post(
        `${API_BASE_URL}/manual-teamassignment`,
        { gameweekId, playerId, team },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      message.success("Player manually assigned to team");
      fetchTeams(gameweekId); // Refresh teams after manual assignment
    } catch (error) {
      console.error("Error manually assigning player", error);
      message.error("Error manually assigning player");
    }
  };

  const isVotingOpen = (gameweek) => {
    const now = new Date();
    const votingCloseTime = new Date(gameweek.votingCloseTime);
    return now < votingCloseTime;
  };

  const fetchRecordedResults = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(`${API_BASE_URL}/gameresults`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const resultData = response.data.reduce((acc, result) => {
        acc[result.gameweekId] = result;
        return acc;
      }, {});
      setRecordedResults(resultData);
    } catch (error) {
      console.error("Error fetching recorded results", error);
    }
  };

  const showAddGameweekModal = () => {
    setIsAddGameweekModalVisible(true);
  };

  const handleAddGameweek = async () => {
    if (!selectedDate) {
      message.error("Please select a date for the gameweek.");
      return;
    }

    try {
      const token = await getAccessTokenSilently();
      await axios.post(
        `${API_BASE_URL}/gameweeks`,
        { date: selectedDate },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      fetchGameweeks();
      setSelectedDate(null);
      setIsAddGameweekModalVisible(false);
    } catch (error) {
      console.error("Error adding gameweek", error);
    }
  };

  const setPlayerAvailability = async (playerId, gameweekId, status) => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post(
        `${API_BASE_URL}/availability`,
        { gameweekId, playerIds: [playerId], status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setAvailability((prevAvailability) => ({
        ...prevAvailability,
        [gameweekId]: { ...prevAvailability[gameweekId], [playerId]: status },
      }));
      handleTeamAssignment(gameweekId);
      setSearchTerm("");
    } catch (error) {
      console.error("Error setting availability", error);
    }
  };

  const removePlayerAvailability = async (playerId, gameweekId) => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post(
        `${API_BASE_URL}/availability`,
        { gameweekId, playerIds: [playerId], status: false },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setAvailability((prevAvailability) => ({
        ...prevAvailability,
        [gameweekId]: { ...prevAvailability[gameweekId], [playerId]: false },
      }));
      handleTeamAssignment(gameweekId);
    } catch (error) {
      console.error("Error removing availability", error);
    }
  };

  const deleteGameweek = async (id) => {
    try {
      const token = await getAccessTokenSilently();
      await axios.delete(`${API_BASE_URL}/gameweeks/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchGameweeks();
    } catch (error) {
      console.error("Error deleting gameweek", error);
    }
  };

  const handleTeamAssignment = async (gameweekId) => {
    try {
      const token = await getAccessTokenSilently();
      await axios.get(`${API_BASE_URL}/pick-teams?gameweekId=${gameweekId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      message.success("Teams assigned successfully");
      fetchTeams(gameweekId);
      fetchAssignments(gameweekId);
    } catch (error) {
      console.error("Error picking teams", error);
      message.error("Error picking teams");
    }
  };

  const handleGameResult = async (values) => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post(`${API_BASE_URL}/gameresults`, values, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      message.success("Game result recorded successfully");
      setIsResultModalVisible(false);
      form.resetFields();
      fetchGameweeks();
      fetchRecordedResults();
    } catch (error) {
      console.error("Error recording game result", error);
      message.error(
        error.response?.data?.error || "Error recording game result"
      );
    }
  };

  const showResultModal = (gameweekId) => {
    setResultGameweekId(gameweekId);
    form.setFieldsValue({ gameweekId });
    setIsResultModalVisible(true);
    fetchAvailability(gameweekId); // Fetch availability only once when opening the modal
  };

  const showManualAssignmentModal = (gameweekId) => {
    setSelectedGameweekId(gameweekId);
    setManualAssignmentModalVisible(true);
    fetchTeams(gameweekId);
  };

  const assignTeam = (playerId, team) => {
    setPlayerAssignments((prevAssignments) => ({
      ...prevAssignments,
      [playerId]: team,
    }));
    handleManualTeamAssignment(playerId, selectedGameweekId, team);
  };

  const handleCancel = () => {
    setIsAddGameweekModalVisible(false);
    setIsResultModalVisible(false);
    setManualAssignmentModalVisible(false);
    form.resetFields();
  };

  const filteredPlayers = (gameweekId) =>
    players.filter(
      (player) =>
        !availability[gameweekId]?.[player.id] &&
        player.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  useEffect(() => {
    fetchGameweeks();
    fetchPlayers();
    fetchRecordedResults();
  }, []);

  function formatTime(isoString) {
    const date = new Date(isoString);

    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
    };

    return date.toLocaleDateString("en-US", options);
  }

  // Sort gameweeks by date in descending order
  const sortedGameweeks = Object.values(gameweeks).sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  return (
    <div>
      <Button size="small" type="primary" block onClick={showAddGameweekModal}>
        <PlusOutlined />
        Add Gameweek
      </Button>
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
                style={{ width: "100%" }}
                onChange={() => {
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
                    <div style={{padding: 8, background:'rgba(242, 242, 242, 1)', borderRadius:8, margin:8, marginRight:16, flex:1 }}>
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
      />
      <Modal
        title="Add Gameweek"
        visible={isAddGameweekModalVisible}
        onOk={handleAddGameweek}
        onCancel={handleCancel}
        okText="Add"
        cancelText="Cancel"
      >
        <DatePicker
          onChange={(date, dateString) => setSelectedDate(dateString)}
        />
      </Modal>
      <Modal
        title="Record Game Result"
        visible={isResultModalVisible}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={() => form.submit()}>
            Submit
          </Button>,
        ]}
      >
        <Form form={form} onFinish={handleGameResult}>
          <Form.Item name="gameweekId" hidden>
            <Input />
          </Form.Item>
          <Row style={{ height: 124, marginTop: 32 }} justify="center">
            <Space style={{ height: 124 }}>
              <Col span={11}>
                <Form.Item
                  name="teamA_score"
                  rules={[
                    {
                      required: true,
                      message: "Please enter the score for Team A",
                    },
                  ]}
                >
                  <div>
                    <label
                      style={{
                        position: "absolute",
                        top: 10,
                        zIndex: 2,
                        left: 10,
                        fontSize: 12,
                        color: "rgba(0, 0, 0, 0.45)",
                      }}
                    >
                      A
                    </label>
                    <Input
                      style={{
                        width: 124,
                        height: 124,
                        fontSize: 50,
                        textAlign: "center",
                        MozAppearance: "textfield",
                        appearance: "textfield",
                        WebkitAppearance: "none",
                      }}
                      type="number"
                      placeholder=""
                    />
                  </div>
                </Form.Item>
              </Col>
              <Col span={11}>
                <Form.Item
                  name="teamB_score"
                  rules={[
                    {
                      required: true,
                      message: "Please enter the score for Team B",
                    },
                  ]}
                >
                  <div>
                    <label
                      style={{
                        position: "absolute",
                        top: 10,
                        zIndex: 2,
                        left: 10,
                        fontSize: 12,
                        color: "rgba(0, 0, 0, 0.45)",
                      }}
                    >
                      B
                    </label>
                    <Input
                      style={{
                        width: 124,
                        height: 124,
                        fontSize: 50,
                        textAlign: "center",
                        MozAppearance: "textfield",
                        appearance: "textfield",
                        WebkitAppearance: "none",
                      }}
                      type="number"
                      placeholder=""
                    />
                  </div>
                </Form.Item>
              </Col>
            </Space>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="Manual Team Assignment"
        visible={manualAssignmentModalVisible}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            Cancel
          </Button>,
        ]}
      >
        <p>Assign Players to Teams</p>
        {players.map((player) => (
          <div
            key={player.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              margin: "8px 0",
            }}
          >
            <span>{player.name}</span>
            <Space>
              <Button
                type={
                  playerAssignments[player.id] === "A" ? "primary" : "default"
                }
                onClick={() => assignTeam(player.id, "A")}
              >
                Team A
              </Button>
              <Button
                type={
                  playerAssignments[player.id] === "B" ? "primary" : "default"
                }
                onClick={() => assignTeam(player.id, "B")}
              >
                Team B
              </Button>
            </Space>
          </div>
        ))}
      </Modal>
    </div>
  );
};

export default GameweekManager;
