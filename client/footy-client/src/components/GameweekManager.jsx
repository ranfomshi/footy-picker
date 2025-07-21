import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button, DatePicker, message, Form, Modal, Space, Input, Row, Col, TimePicker, InputNumber, AutoComplete, Typography, Select, Radio, Divider } from "antd";
import { PlusOutlined, CalendarOutlined, TeamOutlined } from "@ant-design/icons";
import GameweekList from "./GameweekList";
import RecordResultModal from "./RecordResultModal";
import VotePlayerModal from "./VotePlayerModal";
import PlayerAvatar from "./PlayerAvatar";
import { useAuth0 } from "@auth0/auth0-react";

const { Text } = Typography;
const { Option } = Select;

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
  const [isAdmin, setIsAdmin] = useState(false);
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

  // — Check admin status
  const checkAdminStatus = async () => {
    try {
      const token = await getAccessTokenSilently();
      const { data } = await axios.get(
        `${API}/check-room-membership`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsAdmin(data.activeRoom?.isAdmin || false);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
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
    message.success("Fixture added");
    setIsAddVisible(false);
    fetchGameweeks();
  };

  // — Delete gameweek
  const deleteGameweek = async (gameweekId) => {
    try {
      const token = await getAccessTokenSilently();
      await axios.delete(`${API}/gameweeks/${gameweekId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("Fixture deleted");
      fetchGameweeks();
    } catch (error) {
      console.error('Error deleting gameweek:', error);
      message.error("Failed to delete fixture");
    }
  };

  // — Manual override - handle individual player assignment changes
  const handlePlayerAssignmentChange = async (playerId, newAssignment) => {
    try {
      const token = await getAccessTokenSilently();

      // Make immediate API call for the specific player
      await axios.post(
        `${API}/manual-teamassignment`,
        {
          gameweekId: selectedGameweekId,
          playerId: playerId,
          team: newAssignment === 'unassigned' ? 'None' : newAssignment
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Don't update availability automatically - let admins control this separately
      // The manual assignment should take precedence over automatic team picking

      // Refresh team assignments to show the change
      await fetchTeams(selectedGameweekId);

      message.success(`Player assignment updated`);

    } catch (error) {
      console.error('Error updating player assignment:', error);
      message.error(error.response?.data?.error || 'Failed to update assignment');
      // Revert the form field on error
      const currentTeams = teams[selectedGameweekId];
      let currentAssignment = 'unassigned';
      if (currentTeams?.teamA?.some(p => p.id === playerId)) {
        currentAssignment = 'A';
      } else if (currentTeams?.teamB?.some(p => p.id === playerId)) {
        currentAssignment = 'B';
      }
      manualForm.setFieldValue(`player_${playerId}`, currentAssignment);
    }
  };

  // — Manual override form handler (now just closes modal since changes are applied immediately)
  const handleManual = async (values) => {
    // All changes have already been applied individually
    message.success("All team assignments have been updated");
    setIsManualVisible(false);
    manualForm.resetFields();
  };

  useEffect(() => {
    fetchGameweeks();
    fetchPlayers();
    checkAdminStatus();
  }, []);

  // Refresh the manual assignment form when teams data changes and modal is open
  useEffect(() => {
    if (isManualVisible && selectedGameweekId && teams[selectedGameweekId]) {
      // Reset form with current team assignments to reflect any changes
      const formValues = {};
      players.forEach(player => {
        const currentTeams = teams[selectedGameweekId];
        let currentAssignment = 'unassigned';
        if (currentTeams?.teamA?.some(p => p.id === player.id)) {
          currentAssignment = 'A';
        } else if (currentTeams?.teamB?.some(p => p.id === player.id)) {
          currentAssignment = 'B';
        }
        formValues[`player_${player.id}`] = currentAssignment;
      });
      manualForm.setFieldsValue(formValues);
    }
  }, [teams, isManualVisible, selectedGameweekId, players]);

  const sorted = Object.values(gameweeks).sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const filteredPlayers = (gwId) =>
    players
      .filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));

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
    <div style={{ overflowY: 'auto', paddingRight: 8 }}>
      {/* Compact Header Section */}
      <div style={{
        background: 'linear-gradient(135deg, #00b96b 0%, #52c41a 100%)',
        borderRadius: 12,
        padding: '16px',
        marginBottom: 16,
        color: 'white',
        boxShadow: '0 -2px 12px rgba(0, 185, 107, 0.12)'
      }}>
        {/* Main Controls Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarOutlined style={{ fontSize: 18, color: 'white' }} />
            <Text strong style={{ fontSize: 16, color: 'white' }}>Fixtures</Text>
          </div>

          {/* Add Fixture Button */}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsAddVisible(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              fontWeight: 500,
              height: 36
            }}
          >
            New
          </Button>
        </div>
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
        showManualAssignmentModal={async (id) => {
          setSelectedGameweekId(id);
          // Always fetch fresh team data when opening the override modal
          // to ensure we have the latest assignments
          await fetchTeams(id);
          setIsManualVisible(true);
        }}
        showRecordResultModal={showRecordResultModal}
        showVotePlayerModal={showVotePlayerModal}
        deleteGameweek={deleteGameweek}
        hasVoted={hasVoted}
        isAdmin={isAdmin}
        isVotingOpen={(gw) => new Date() < new Date(gw.votingCloseTime)}
        formatDate={formatDate}
        formatVotingCloseTime={formatVotingCloseTime}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {/* Add Fixture Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarOutlined style={{ color: '#00b96b' }} />
            <span>New Fixture</span>
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
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TeamOutlined style={{ color: '#00b96b' }} />
            <span>Override Team Assignments</span>
          </div>
        }
        open={isManualVisible}
        onCancel={() => setIsManualVisible(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        {selectedGameweekId && (
          <Form form={manualForm} layout="vertical" onFinish={handleManual}>
            <div style={{ marginBottom: 16 }}>
              <Text style={{ color: '#6b7280' }}>
                Set team assignments for each player. Players can be assigned to Team A, Team B, or left unassigned.
              </Text>
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: 16 }}>
              {players.sort((a, b) => a.name.localeCompare(b.name)).map((player, index) => {
                // Get current assignment for this player
                const currentTeams = teams[selectedGameweekId];
                let currentAssignment = 'unassigned';
                if (currentTeams?.teamA?.some(p => p.id === player.id)) {
                  currentAssignment = 'A';
                } else if (currentTeams?.teamB?.some(p => p.id === player.id)) {
                  currentAssignment = 'B';
                }

                return (
                  <div key={player.id} style={{
                    marginBottom: 12,
                    padding: 12,
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    background: '#fafbfc'
                  }}>
                    <Row align="middle" gutter={16}>
                      <Col span={8}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <PlayerAvatar player={player} size={32} />
                          <Text strong>{player.name}</Text>
                        </div>
                      </Col>
                      <Col span={16}>
                        <Form.Item
                          name={`player_${player.id}`}
                          initialValue={currentAssignment}
                          style={{ margin: 0 }}
                        >
                          <Radio.Group
                            size="small"
                            onChange={(e) => handlePlayerAssignmentChange(player.id, e.target.value)}
                          >
                            <Radio.Button value="unassigned">Unassigned</Radio.Button>
                            <Radio.Button value="A">Team A</Radio.Button>
                            <Radio.Button value="B">Team B</Radio.Button>
                          </Radio.Group>
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                );
              })}
            </div>

            <Divider />

            <Form.Item style={{ marginBottom: 0 }}>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={() => setIsManualVisible(false)}>Close</Button>
              </Space>
            </Form.Item>
          </Form>
        )}
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
