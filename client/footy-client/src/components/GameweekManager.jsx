// src/components/GameweekManager.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button, DatePicker, message, Form, Modal, Space, Input, Row, Col, TimePicker, InputNumber, AutoComplete } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import GameweekList from "./GameweekList";
import { useAuth0 } from "@auth0/auth0-react";

const GameweekManager = () => {
  const { getAccessTokenSilently } = useAuth0();
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
      `${API}/votes/status?gameweekId=${gwId}`,
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
    fetchAvailability(gwId);
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
    <>
      <Button
        block
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => setIsAddVisible(true)}
        style={{ marginBottom: 16 }}
      >
        Add Gameweek
      </Button>

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
        hasVoted={hasVoted}
        isVotingOpen={(gw) => new Date() < new Date(gw.votingCloseTime)}
        formatDate={formatDate}
        formatVotingCloseTime={formatVotingCloseTime}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {/* Add Gameweek */}
      <Modal
        title="Add Gameweek"
        open={isAddVisible}
        onCancel={() => setIsAddVisible(false)}
        footer={null}
        destroyOnClose
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

          <Form.Item>
            <Space>
              <Button onClick={() => { setIsAddVisible(false); addForm.resetFields(); }}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                Add Gameweek
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Manual Override */}
      <Modal
        title="Override Assignments"
        visible={isManualVisible}
        onCancel={() => setIsManualVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleManual}>
          {/* your override UI */}
          <Form.Item>
            <Space>
              <Button onClick={() => setIsManualVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                Save
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default GameweekManager;
