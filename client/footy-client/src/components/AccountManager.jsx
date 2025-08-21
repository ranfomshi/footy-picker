import React, { useState, useEffect } from "react";
import {
  Avatar,
  Button,
  message,
  Modal,
  Space,
  Typography,
  Select,
  Form,
  Input,
  Card,
  Row,
  Col,
  Tag,
  Divider,
  Tooltip
} from "antd";
import {
  EditOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  CloseOutlined,
  TrophyOutlined,
  StarOutlined,
  SafetyCertificateOutlined,
  PlusOutlined
} from "@ant-design/icons";
import { useAuth0 } from "@auth0/auth0-react";
import axios from "axios";
import useStore from "../useStore";
import ScoringGuide from "./ScoringGuide";
import { invalidatePlayersCache } from "../utils/playerCache";

const { Title, Text } = Typography;
const { Option } = Select;

export default function AccountManager() {
  const { user, logout, getAccessTokenSilently } = useAuth0();
  const [unlinking, setUnlinking] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isEditVisible, setIsEditVisible] = useState(false);
  const [isPositionsVisible, setIsPositionsVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [currentRoomSport, setCurrentRoomSport] = useState(null);
  const [availablePositions, setAvailablePositions] = useState([]);
  const [favoritePositions, setFavoritePositions] = useState([]);
  const [isCreateRoomVisible, setIsCreateRoomVisible] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoinRoomVisible, setIsJoinRoomVisible] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [availableSports, setAvailableSports] = useState([]);
  const [form] = Form.useForm();
  const [positionsForm] = Form.useForm();
  const [createRoomForm] = Form.useForm();
  const [joinRoomForm] = Form.useForm();

  const { roomCode, roomName, setRoomCode, setRoomName, setHasJoinedRoom } = useStore();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // Fetch user's rooms and admin status
  useEffect(() => {
    (async () => {
      try {
        const token = await getAccessTokenSilently();
        const { data } = await axios.get(
          `${API_BASE_URL}/check-room-membership`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRooms(data.joinedRooms || []);
        if (data.activeRoom) {
          setRoomCode(data.activeRoom.code);
          setRoomName(data.activeRoom.name);
          setCurrentRoomId(data.activeRoom.id);
          setCurrentRoomSport(data.activeRoom.sportId);
          setIsAdmin(data.activeRoom.isAdmin);
          setHasJoinedRoom(true);

          // Fetch favorite positions for the current user
          await fetchFavoritePositions();
        }
      } catch (err) {
        console.error("Failed to load rooms", err);
        message.error("Could not fetch your rooms");
      } finally {
        setLoadingRooms(false);
      }
    })();
  }, [API_BASE_URL, getAccessTokenSilently, setHasJoinedRoom, setRoomCode, setRoomName]);

  // Fetch favorite positions for current user
  const fetchFavoritePositions = async () => {
    try {
      const token = await getAccessTokenSilently();
      const { data } = await axios.get(
        `${API_BASE_URL}/current-player`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFavoritePositions(data.favoritePositions || []);
    } catch (error) {
      console.error("Failed to fetch favorite positions", error);
    }
  };

  // Fetch available positions for the room's sport
  const fetchAvailablePositions = async (sportId) => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/sports/${sportId}`);
      setAvailablePositions(data.positions || []);
    } catch (error) {
      console.error("Failed to fetch sport positions", error);
      message.error("Could not load available positions");
    }
  };

  // Switch active room
  const handleRoomChange = async (code) => {
    try {
      const token = await getAccessTokenSilently();
      const { data } = await axios.post(
        `${API_BASE_URL}/set-active-room`,
        { roomId: code },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const selected = rooms.find(r => r.code === code);
      if (selected) {
        setRoomCode(selected.code);
        setRoomName(selected.name);
        setCurrentRoomId(selected.id);
        setCurrentRoomSport(selected.sportId);
        setIsAdmin(data.activeRoom.isAdmin);
        setHasJoinedRoom(true);
        await fetchFavoritePositions();
      }
      message.success(`Switched to room: ${selected.name}`);
    } catch (err) {
      console.error("Failed to switch room", err);
      message.error("Could not switch room");
    }
  };

  // Open edit modal
  const openEdit = () => {
    form.setFieldsValue({
      sport: rooms.find(r => r.id === currentRoomId)?.sport,
      name: roomName,
      code: roomCode,
      teamAColor: rooms.find(r => r.id === currentRoomId)?.teamAColor,
      teamBColor: rooms.find(r => r.id === currentRoomId)?.teamBColor
    });
    setIsEditVisible(true);
  };

  // Open positions modal
  const openPositions = async () => {
    if (currentRoomSport) {
      await fetchAvailablePositions(currentRoomSport);
      positionsForm.setFieldsValue({
        favoritePositions: favoritePositions
      });
      setIsPositionsVisible(true);
    }
  };

  // Handle room update
  const handleEditOk = async () => {
    try {
      const values = await form.validateFields();
      const token = await getAccessTokenSilently();
      await axios.put(
        `${API_BASE_URL}/rooms/${currentRoomId}`,
        {
          name: values.name,
          teamAColor: values.teamAColor,
          teamBColor: values.teamBColor
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRoomName(values.name);
      // update local rooms list
      setRooms(rs => rs.map(r => r.id === currentRoomId ? { ...r, name: values.name, teamAColor: values.teamAColor, teamBColor: values.teamBColor } : r));
      message.success("Room updated successfully");
      setIsEditVisible(false);
    } catch (err) {
      console.error("Failed to update room", err);
      message.error("Could not update room");
    }
  };

  // Handle favorite positions update
  const handlePositionsOk = async () => {
    try {
      const values = await positionsForm.validateFields();
      const token = await getAccessTokenSilently();
      await axios.put(
        `${API_BASE_URL}/favorite-positions`,
        { favoritePositions: values.favoritePositions || [] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFavoritePositions(values.favoritePositions || []);
      message.success("Favorite positions updated successfully");
      setIsPositionsVisible(false);
    } catch (err) {
      console.error("Failed to update favorite positions", err);
      message.error("Could not update favorite positions");
    }
  };

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      const token = await getAccessTokenSilently();
      await axios.post(
        `${API_BASE_URL}/unlink-player`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success("Player unlinked successfully");

      // Invalidate players cache since player's auth0Id has changed
      invalidatePlayersCache();

      setHasJoinedRoom(false);
    } catch (error) {
      console.error("Error unlinking player:", error);
      message.error("Failed to unlink player");
    } finally {
      setUnlinking(false);
      setIsConfirmVisible(false);
    }
  };

  // Fetch available sports
  const fetchAvailableSports = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/sports`);
      setAvailableSports(data || []);
    } catch (error) {
      console.error("Failed to fetch sports", error);
      message.error("Could not load available sports");
    }
  };

  // Open create room modal
  const openCreateRoom = async () => {
    await fetchAvailableSports();
    createRoomForm.setFieldsValue({
      teamAColor: '#00b96b',
      teamBColor: '#ff4d4f'
    });
    setIsCreateRoomVisible(true);
  };

  // Handle create room
  const handleCreateRoom = async () => {
    try {
      setIsCreatingRoom(true);
      const values = await createRoomForm.validateFields();
      const token = await getAccessTokenSilently();

      const { data } = await axios.post(
        `${API_BASE_URL}/create-room`,
        {
          name: values.name,
          sportId: values.sportId,
          teamAColor: values.teamAColor,
          teamBColor: values.teamBColor
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update state with new room
      setRoomCode(data.room.code);
      setRoomName(data.room.name);
      setCurrentRoomId(data.room.id);
      setCurrentRoomSport(values.sportId);
      setIsAdmin(true); // Creator is always admin
      setHasJoinedRoom(true);

      // Add to rooms list
      const newRoom = {
        id: data.room.id,
        name: data.room.name,
        code: data.room.code,
        sport: data.room.sport,
        sportId: values.sportId,
        teamAColor: data.room.teamAColor,
        teamBColor: data.room.teamBColor
      };
      setRooms(prevRooms => [...prevRooms, newRoom]);

      // Clear cache and fetch new data
      invalidatePlayersCache();
      await fetchFavoritePositions();

      message.success(`Room "${data.room.name}" created successfully! You are now the admin.`);
      setIsCreateRoomVisible(false);
      createRoomForm.resetFields();
    } catch (error) {
      console.error("Failed to create room", error);
      message.error(error.response?.data?.error || "Could not create room");
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Handle join room
  const handleJoinRoom = async () => {
    try {
      setIsJoiningRoom(true);
      const values = await joinRoomForm.validateFields();
      const token = await getAccessTokenSilently();

      const { data } = await axios.post(
        `${API_BASE_URL}/join-room`,
        { roomCode: values.roomCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Add to rooms list if not already there
      const existingRoom = rooms.find(r => r.code === data.room.code);
      if (!existingRoom) {
        const newRoom = {
          id: data.room.id,
          name: data.room.name,
          code: data.room.code,
          sport: data.room.sport,
          sportId: data.room.sportId,
          teamAColor: data.room.teamAColor,
          teamBColor: data.room.teamBColor
        };
        setRooms(prevRooms => [...prevRooms, newRoom]);
      }

      // Switch to the joined room
      setRoomCode(data.room.code);
      setRoomName(data.room.name);
      setCurrentRoomId(data.room.id);
      setCurrentRoomSport(data.room.sportId);
      setIsAdmin(data.isAdmin || false);
      setHasJoinedRoom(true);

      // Clear cache and fetch new data
      invalidatePlayersCache();
      await fetchFavoritePositions();

      message.success(`Successfully joined room "${data.room.name}"!`);
      setIsJoinRoomVisible(false);
      joinRoomForm.resetFields();
    } catch (error) {
      console.error("Failed to join room", error);
      message.error(error.response?.data?.error || "Could not join room");
    } finally {
      setIsJoiningRoom(false);
    }
  };

  return (
    <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #00b96b 0%, #52c41a 100%)',
        borderRadius: 12,
        padding: '20px',
        marginBottom: 24,
        color: 'white',
        boxShadow: '0 -2px 12px rgba(0, 185, 107, 0.12)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          {/* Profile Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <Text strong style={{ fontSize: 14, color: 'white', display: 'block' }}>
                {user.name || 'User'}
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 12 }}>
                {user.email}
              </Text>
            </div>
            <Avatar
              src={user.picture}
              size={48}
              icon={<UserOutlined />}
              style={{
                border: '2px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}
            />
          </div>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        {/* Positions & Actions Card */}
        <Col xs={24} md={12}>
          <Card
            style={{
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              height: '100%'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <StarOutlined style={{ fontSize: 16, color: '#00b96b' }} />
                <Text strong style={{ fontSize: 14 }}>Favorite Positions</Text>
              </div>

              {favoritePositions.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {favoritePositions.map((position, index) => (
                    <Tag
                      key={position}
                      color={index === 0 ? '#00b96b' : index === 1 ? '#1890ff' : '#faad14'}
                      style={{
                        marginBottom: 4,
                        fontSize: 12,
                        padding: '4px 8px',
                        borderRadius: 6
                      }}
                    >
                      {position} {index === 0 ? '(1st)' : index === 1 ? '(2nd)' : '(3rd)'}
                    </Tag>
                  ))}
                </div>
              ) : (
                <Text style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 16 }}>
                  No positions selected
                </Text>
              )}
            </div>

            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <Button
                block
                icon={<StarOutlined />}
                onClick={openPositions}
                style={{
                  height: 40,
                  borderRadius: 8,
                  fontWeight: 500
                }}
              >
                Set Favorite Positions
              </Button>
            </Space>
          </Card>
        </Col>

        {/* Room Management Card */}
        <Col xs={24} md={12}>
          <Card
            style={{
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              height: '100%'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <SettingOutlined style={{ fontSize: 16, color: '#00b96b' }} />
                <Text strong style={{ fontSize: 14 }}>Room Management</Text>
              </div>

              <div style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, display: 'block' }}>
                  Active Room
                </Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Select
                    style={{ flex: 1, minWidth: 150 }}
                    placeholder={loadingRooms ? "Loading rooms..." : "Choose a room"}
                    loading={loadingRooms}
                    value={roomCode}
                    onChange={handleRoomChange}
                    size="middle"
                  >
                    {rooms.map((r) => (
                      <Option key={r.code} value={r.code}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{r.name}</span>
                          <code style={{
                            background: '#f1f3f4',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 11
                          }}>
                            {r.code}
                          </code>
                        </div>
                      </Option>
                    ))}
                  </Select>
                  {isAdmin && (
                    <Tooltip title="Edit Room">
                      <Button
                        icon={<EditOutlined />}
                        onClick={openEdit}
                        style={{
                          borderRadius: 6,
                          height: 32
                        }}
                      />
                    </Tooltip>
                  )}
                </div>
              </div>

              {roomName && (
                <div style={{
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                  border: '1px solid #e9ecef',
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 20
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 14 }}>
                      {roomName}
                    </Text>
                    {isAdmin && (
                      <Tooltip title="Admin">
                        <SafetyCertificateOutlined
                          style={{
                            color: '#722ed1',
                            fontSize: 16,
                            background: 'rgba(114, 46, 209, 0.1)',
                            padding: '4px',
                            borderRadius: '50%'
                          }}
                        />
                      </Tooltip>
                    )}
                  </div>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    Room Code: <code style={{
                      background: 'rgba(0, 185, 107, 0.1)',
                      color: '#00b96b',
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontWeight: 600,
                      fontSize: 11
                    }}>
                      {roomCode}
                    </code>
                  </Text>
                </div>
              )}
            </div>

            <Divider style={{ margin: '16px 0' }} />

            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <Button
                block
                icon={<PlusOutlined />}
                onClick={openCreateRoom}
                style={{
                  height: 40,
                  borderRadius: 8,
                  fontWeight: 500
                }}
              >
                Create New Room
              </Button>

              <Button
                block
                icon={<UserOutlined />}
                onClick={() => setIsJoinRoomVisible(true)}
                style={{
                  height: 40,
                  borderRadius: 8,
                  fontWeight: 500
                }}
              >
                Join Existing Room
              </Button>

              <Button
                block
                icon={<LogoutOutlined />}
                onClick={() => {
                  // Clear any stored state before logout
                  localStorage.clear();
                  logout({
                    returnTo: window.location.origin,
                    logoutParams: {
                      returnTo: window.location.origin
                    }
                  });
                }}
                style={{
                  height: 40,
                  borderRadius: 8,
                  fontWeight: 500
                }}
              >
                Log Out
              </Button>

              <Button
                block
                danger
                icon={<CloseOutlined />}
                onClick={() => setIsConfirmVisible(true)}
                style={{
                  height: 40,
                  borderRadius: 8,
                  fontWeight: 500
                }}
              >
                Leave Room
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Scoring System Section */}
      <Row style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card
            style={{
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(0, 0, 0, 0.06)'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrophyOutlined style={{ fontSize: 16, color: '#00b96b' }} />
                <Text strong style={{ fontSize: 14 }}>Scoring System</Text>
              </div>
            </div>

            <Button
              block
              icon={<TrophyOutlined />}
              onClick={() => setIsModalVisible(true)}
              style={{
                height: 40,
                borderRadius: 8,
                fontWeight: 500
              }}
            >
              View Scoring System Guide
            </Button>
          </Card>
        </Col>
      </Row>

      {/* Edit Room Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SettingOutlined style={{ color: '#00b96b' }} />
            <span>Edit Room</span>
          </div>
        }
        open={isEditVisible}
        onOk={handleEditOk}
        onCancel={() => setIsEditVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Sport" name="sport">
            <Input disabled />
          </Form.Item>
          <Form.Item label="Room Name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Team A Color" name="teamAColor" rules={[{ required: true }]}>
            <Input type="color" />
          </Form.Item>
          <Form.Item label="Team B Color" name="teamBColor" rules={[{ required: true }]}>
            <Input type="color" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Room Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SettingOutlined style={{ color: '#00b96b' }} />
            <span>Create New Room</span>
          </div>
        }
        open={isCreateRoomVisible}
        onOk={handleCreateRoom}
        onCancel={() => {
          setIsCreateRoomVisible(false);
          createRoomForm.resetFields();
        }}
        destroyOnClose
        width={500}
        okText={isCreatingRoom ? "Creating..." : "Create Room"}
        confirmLoading={isCreatingRoom}
        cancelButtonProps={{ disabled: isCreatingRoom }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text style={{ color: '#6b7280', fontSize: 14 }}>
            Create a new room and become the admin. You'll automatically join this room.
          </Text>
        </div>
        <Form form={createRoomForm} layout="vertical">
          <Form.Item
            label="Room Name"
            name="name"
            rules={[
              { required: true, message: 'Please enter a room name' },
              { min: 3, message: 'Room name must be at least 3 characters' }
            ]}
          >
            <Input placeholder="e.g. Sunday Football League" />
          </Form.Item>

          <Form.Item
            label="Sport"
            name="sportId"
            rules={[{ required: true, message: 'Please select a sport' }]}
          >
            <Select placeholder="Select a sport">
              {availableSports.map((sport) => (
                <Option key={sport.id} value={sport.id}>
                  {sport.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Team A Color"
                name="teamAColor"
                rules={[{ required: true, message: 'Please select Team A color' }]}
              >
                <Input type="color" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Team B Color"
                name="teamBColor"
                rules={[{ required: true, message: 'Please select Team B color' }]}
              >
                <Input type="color" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Join Room Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserOutlined style={{ color: '#00b96b' }} />
            <span>Join Existing Room</span>
          </div>
        }
        open={isJoinRoomVisible}
        onOk={handleJoinRoom}
        onCancel={() => {
          setIsJoinRoomVisible(false);
          joinRoomForm.resetFields();
        }}
        destroyOnClose
        width={400}
        okText={isJoiningRoom ? "Joining..." : "Join Room"}
        confirmLoading={isJoiningRoom}
        cancelButtonProps={{ disabled: isJoiningRoom }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text style={{ color: '#6b7280', fontSize: 14 }}>
            Enter the room code to join an existing room. You'll be added to the room and it will become your active room.
          </Text>
        </div>
        <Form form={joinRoomForm} layout="vertical">
          <Form.Item
            label="Room Code"
            name="roomCode"
            rules={[
              { required: true, message: 'Please enter a room code' },
              { len: 5, message: 'Room code must be exactly 5 characters' }
            ]}
          >
            <Input
              placeholder="e.g. ABC123"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Favorite Positions Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StarOutlined style={{ color: '#00b96b' }} />
            <span>Set Favorite Positions</span>
          </div>
        }
        open={isPositionsVisible}
        onOk={handlePositionsOk}
        onCancel={() => setIsPositionsVisible(false)}
        destroyOnClose
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <Text style={{ color: '#6b7280', fontSize: 14 }}>
            Select up to 3 positions in order of preference. This helps with team balancing.
          </Text>
        </div>
        <Form form={positionsForm} layout="vertical">
          <Form.Item
            label="Favorite Positions (in order of preference)"
            name="favoritePositions"
            rules={[
              {
                validator: (_, value) => {
                  if (value && value.length > 3) {
                    return Promise.reject(new Error('You can select up to 3 positions'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <Select
              mode="multiple"
              placeholder="Select your favorite positions..."
              style={{ width: '100%' }}
              maxTagCount={3}
            >
              {availablePositions.map(position => (
                <Option key={position} value={position}>
                  {position}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Scoring Guide Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrophyOutlined style={{ color: '#00b96b' }} />
            <span>Scoring System Guide</span>
          </div>
        }
        open={isModalVisible}
        onOk={() => setIsModalVisible(false)}
        onCancel={() => setIsModalVisible(false)}
        width="90%"
        style={{ top: 20 }}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsModalVisible(false)}>
            Close
          </Button>
        ]}
      >
        <ScoringGuide />
      </Modal>

      {/* Leave Room Confirmation Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CloseOutlined style={{ color: '#ff4d4f' }} />
            <span>Leave Room</span>
          </div>
        }
        open={isConfirmVisible}
        onOk={handleUnlink}
        onCancel={() => setIsConfirmVisible(false)}
        okText="Yes, Leave"
        cancelText="Cancel"
        okButtonProps={{ danger: true, loading: unlinking }}
        cancelButtonProps={{ disabled: unlinking }}
      >
        <div style={{ padding: '16px 0' }}>
          <Text>
            Are you sure you want to leave the room{' '}
            <Text strong>{roomName}</Text> ({roomCode})?
          </Text>
          <div style={{ marginTop: 12, padding: 12, background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 6 }}>
            <Text style={{ fontSize: 13, color: '#ad6800' }}>
              This will unlink your profile from the player but leave the player in the room
              so you can still take part in games with your group.
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  );
}
