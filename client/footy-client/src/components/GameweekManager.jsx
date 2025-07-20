import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button, DatePicker, message, Form, Modal, Space, Input, Row, Col, TimePicker, InputNumber, AutoComplete, Typography } from "antd";
import { PlusOutlined, CalendarOutlined } from "@ant-design/icons";
import GameweekList from "./GameweekList";
import RecordResultModal from "./RecordResultModal";
import VotePlayerModal from "./VotePlayerModal";
import { useAuth0 } from "@auth0/auth0-react";

const { Text } = Typography;

const GameweekManager = () => {
  const { getAccessTokenSilently, user } = useAuth0();
  const API = import.meta.env.VITE_API_BASE_URL;

  const [gameweeks, setGameweeks] = useState({});
  const [previousLocations, setPreviousLocations] = useState([]);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState({});
  const [availability, setAvailability] = useState({});
  const [hasVoted, setHasVoted] = useState({});
  const [selectedGameweekId, setSelectedGameweekId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddVisible, setIsAddVisible] = useState(false);
  const [isManualVisible, setIsManualVisible] = useState(false);
  const [isRecordResultVisible, setIsRecordResultVisible] = useState(false);
  const [isVotePlayerVisible, setIsVotePlayerVisible] = useState(false);
  const [selectedGameweekData, setSelectedGameweekData] = useState(null);
  const [form] = Form.useForm();
  const [addForm] = Form.useForm();
  const [manualForm] = Form.useForm();

  // — Fetch all gameweeks
  const fetchGameweeks = async () => {
    const token = await getAccessTokenSilently();
    const { data } = await axios.get(`${API}/gameweeks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setGameweeks(Object.fromEntries(data.map((gw) => [gw.id, gw])));

    // derive unique previous locations
    const locs = Array.from(
      new Set(
        data
          .map((gw) => gw.location)
          .filter((loc) => loc && loc.trim().length > 0)
      )
    );
    setPreviousLocations(locs);
  };

  // — Fetch all players
  const fetchPlayers = async () => {
    const token = await getAccessTokenSilently();
    const { data } = await axios.get(`${API}/players`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setPlayers(data);
  };

  // — Group assignments
  const fetchTeams = async (gwId) => {
    const token = await getAccessTokenSilently();
    const { data } = await axios.get(
      `${API}/teamassignments?gameweekId=${gwId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const grouped = { teamA: [], teamB: [] };
    data.forEach((a) => {
      const p = a.Player;
      if (a.team === "A") grouped.teamA.push(p);
      else grouped.teamB.push(p);
    });
    setTeams((prev) => ({ ...prev, [gwId]: grouped }));
  };


  const fetchAvailability = async (gwId) => {
    const token = await getAccessTokenSilently();
    const { data } = await axios.get(
      `${API}/availability?gameweekId=${gwId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    // Mirror Dart logic:
    const availabilityMap = data.reduce((acc, record) => {
      acc[record.playerId] = record.status;
      return acc;
    }, {});
    setAvailability((prev) => ({ ...prev, [gwId]: availabilityMap }));
  };

  // — Voting status
  const checkVotingStatus = async (gwId) => {
    const token = await getAccessTokenSilently();
    const { data } = await axios.get(
      `${API}/has-voted?gameweekId=${gwId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setHasVoted((prev) => ({ ...prev, [gwId]: data.hasVoted }));
  };

  // AFTER
  const setPlayerAvailability = async (playerId, gwId, avail) => {
    const token = await getAccessTokenSilently();
    await axios.post(
      `${API}/availability`,
      {
        gameweekId: gwId,
        playerIds: [playerId],   // wrap ID in an array
        status: avail            // rename `available` → `status`
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    // 1) refresh availability
    await fetchAvailability(gwId);
    // 2) then refresh the team assignments
    await fetchTeams(gwId);
  };

  // Record Result Modal handlers
  const showRecordResultModal = (gameweekId) => {
    const gameweek = gameweeks[gameweekId];
    if (gameweek) {
      setSelectedGameweekData(gameweek);
      setIsRecordResultVisible(true);
    }
  };

  const handleRecordResult = async (resultData) => {
    try {
      const token = await getAccessTokenSilently();
      // Use the correct endpoint and data structure based on backend
      await axios.post(
        `${API}/gameresults`,
        {
          gameweekId: selectedGameweekData.id,
          teamA_score: resultData.teamA_score,
          teamB_score: resultData.teamB_score
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsRecordResultVisible(false);
      setSelectedGameweekData(null);
      // Refresh gameweeks to show updated result
      fetchGameweeks();
    } catch (error) {
      console.error('Error recording result:', error);
    }
  };

  // Vote Player Modal handlers
  const showVotePlayerModal = (gameweekId) => {
    const gameweek = gameweeks[gameweekId];
    if (gameweek) {
      setSelectedGameweekData(gameweek);
      setIsVotePlayerVisible(true);
    }
  };

  const handleVote = async (gameweekId, selectedPlayer) => {
    try {
      const token = await getAccessTokenSilently();
      console.log('Submitting vote:', { gameweekId, selectedPlayer });
      // Implement voting API call
      const response = await axios.post(
        `${API}/votes`,
        {
          gameweekId: gameweekId,
          votedPlayerId: selectedPlayer
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Vote response:', response.data);
      message.success("Vote submitted successfully!");
      // Refresh voting status and gameweeks to show updated Player of the Match
      await checkVotingStatus(gameweekId);
      await fetchGameweeks();
    } catch (error) {
      console.error('Error submitting vote:', error);
      console.error('Error details:', error.response?.data);
      message.error(error.response?.data?.error || 'Failed to submit vote');
      throw error; // Re-throw so the modal can handle the error state
    }
  };


  // — Add gameweek
  const handleAdd = async (vals) => {
    const token = await getAccessTokenSilently();
    await axios.post(`${API}/gameweeks`, vals, {
      headers: { Authorization: `Bearer ${token}` },
    });
    message.success("Gameweek added");
    setIsAddVisible(false);
    fetchGameweeks();
  };

  // — Manual override
  const handleManual = async (vals) => {
    const token = await getAccessTokenSilently();
    await axios.post(
      `${API}/teamassignments`,
      { gameweekId: selectedGameweekId, assignments: vals },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    message.success("Assignments updated");
    setIsManualVisible(false);
    fetchTeams(selectedGameweekId);
  };

  useEffect(() => {
    fetchGameweeks();
    fetchPlayers();
  }, []);

  const sorted = Object.values(gameweeks).sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const filteredPlayers = (gwId) =>
    players.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // formatting helpers
  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  const formatVotingCloseTime = (iso) =>
    new Date(iso).toLocaleString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    });

  return (
    <div style={{ overflowY: 'auto' }}>
      {/* Header with Add Button */}
      <div style={{ marginBottom: 16, padding: '0 8px 0 8px' }}>
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarOutlined style={{ fontSize: 18, color: '#00b96b' }} />
            <Text strong style={{ fontSize: 16 }}>Gameweeks</Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="small"
            onClick={() => setIsAddVisible(true)}
            style={{
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,185,107,0.2)'
            }}
          >
            Add Gameweek
          </Button>
        </Space>
      </div>

      <GameweekList
        sortedGameweeks={sorted}
        teams={teams}
        availability={availability}
        fetchAvailability={fetchAvailability}
        fetchAssignments={fetchTeams}
        fetchTeams={fetchTeams}
        filteredPlayers={filteredPlayers}
        checkVotingStatus={checkVotingStatus}
        setPlayerAvailability={setPlayerAvailability}
        removePlayerAvailability={(pid, gwId) =>
          setPlayerAvailability(pid, gwId, false)
        }
        showManualAssignmentModal={(id) => {
          setSelectedGameweekId(id);
          setIsManualVisible(true);
        }}
        showRecordResultModal={showRecordResultModal}
        showVotePlayerModal={showVotePlayerModal}
        hasVoted={hasVoted}
        isVotingOpen={(gw) => new Date() < new Date(gw.votingCloseTime)}
        formatDate={formatDate}
        formatVotingCloseTime={formatVotingCloseTime}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {/* Add Gameweek Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarOutlined style={{ color: '#00b96b' }} />
            <span>Add New Gameweek</span>
          </div>
        }
        open={isAddVisible}
        onCancel={() => setIsAddVisible(false)}
        footer={null}
        destroyOnClose
        style={{ top: 20 }}
      >
        <Form
          form={addForm}
          layout="vertical"
          onFinish={handleAdd}
          initialValues={{ maxPlayers: 10 }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="date"
                label="Date"
                rules={[{ required: true, message: 'Please select a date' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="startTime"
                label="Start Time"
                rules={[{ required: true, message: 'Please select start time' }]}
              >
                <TimePicker
                  style={{ width: '100%' }}
                  format="HH:mm"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="location"
            label="Location"
            rules={[{ required: true, message: 'Please enter or select a location' }]}
          >
            <AutoComplete
              options={previousLocations.map((loc) => ({ value: loc }))}
              placeholder="e.g. Main Pitch"
              filterOption={(inputValue, option) =>
                option.value.toLowerCase().includes(inputValue.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item
            name="maxPlayers"
            label="Max Players"
            rules={[
              { type: 'number', min: 2, message: 'Minimum of 2 players' },
              ({ }) => ({
                validator(_, value) {
                  if (!value || value % 2 === 0) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Must be an even number'));
                },
              }),
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={2}
              step={2}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, paddingTop: 16 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => { setIsAddVisible(false); addForm.resetFields(); }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                Add Gameweek
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Manual Override Modal */}
      <Modal
        title="Override Team Assignments"
        visible={isManualVisible}
        onCancel={() => setIsManualVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleManual}>
          {/* your override UI */}
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsManualVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                Save Changes
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Record Result Modal */}
      {selectedGameweekData && (
        <RecordResultModal
          visible={isRecordResultVisible}
          onClose={() => {
            setIsRecordResultVisible(false);
            setSelectedGameweekData(null);
          }}
          onSubmit={handleRecordResult}
          gameweekId={selectedGameweekData.id}
          teamA={teams[selectedGameweekData.id]?.teamA || []}
          teamB={teams[selectedGameweekData.id]?.teamB || []}
          currentUserId={user?.sub}
        />
      )}

      {/* Vote Player Modal */}
      {selectedGameweekData && (
        <VotePlayerModal
          visible={isVotePlayerVisible}
          onClose={() => {
            setIsVotePlayerVisible(false);
            setSelectedGameweekData(null);
          }}
          onVote={handleVote}
          gameweekId={selectedGameweekData.id}
          teamA={teams[selectedGameweekData.id]?.teamA || []}
          teamB={teams[selectedGameweekData.id]?.teamB || []}
          currentUserId={user?.sub}
        />
      )}
    </div>
  );
};

export default GameweekManager;
