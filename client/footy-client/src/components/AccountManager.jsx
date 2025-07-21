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
  Divider
} from "antd";
import {
  EditOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  CloseOutlined,
  TrophyOutlined,
  StarOutlined
} from "@ant-design/icons";
import { useAuth0 } from "@auth0/auth0-react";
import axios from "axios";
import useStore from "../useStore";
import ScoringGuide from "./ScoringGuide";

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
  const [form] = Form.useForm();
  const [positionsForm] = Form.useForm();

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
      setHasJoinedRoom(false);
    } catch (error) {
      console.error("Error unlinking player:", error);
      message.error("Failed to unlink player");
    } finally {
      setUnlinking(false);
      setIsConfirmVisible(false);
    }
  };

  return (
    <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, padding: '0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <UserOutlined style={{ fontSize: 18, color: '#00b96b' }} />
          <Text strong style={{ fontSize: 16 }}>Account Settings</Text>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        {/* Profile Card */}
        <Col xs={24} md={12}>
          <Card
            style={{
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(0, 0, 0, 0.06)'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <Avatar
                src={user.picture}
                size={80}
                style={{ marginBottom: 12 }}
                icon={<UserOutlined />}
              />
              <div>
                <Text strong style={{ fontSize: 16, display: 'block' }}>
                  {user.name || 'User'}
                </Text>
                <Text style={{ color: '#6b7280', fontSize: 14 }}>
                  {user.email}
                </Text>
              </div>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 14, marginBottom: 8, display: 'block' }}>
                Favorite Positions
              </Text>
              {favoritePositions.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {favoritePositions.map((position, index) => (
                    <Tag
                      key={position}
                      color={index === 0 ? '#00b96b' : index === 1 ? '#1890ff' : '#faad14'}
                      style={{ marginBottom: 4 }}
                    >
                      {position} {index === 0 ? '(1st)' : index === 1 ? '(2nd)' : '(3rd)'}
                    </Tag>
                  ))}
                </div>
              ) : (
                <Text style={{ color: '#9ca3af', fontSize: 12 }}>
                  No positions selected
                </Text>
              )}
            </div>

            <Button
              block
              icon={<StarOutlined />}
              onClick={openPositions}
              style={{ marginBottom: 12 }}
            >
              Set Favorite Positions
            </Button>

            <Button
              block
              icon={<TrophyOutlined />}
              onClick={() => setIsModalVisible(true)}
            >
              View Scoring System
            </Button>
          </Card>
        </Col>

        {/* Room Management Card */}
        <Col xs={24} md={12}>
          <Card
            style={{
              borderRadius: 12,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(0, 0, 0, 0.06)'
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <SettingOutlined style={{ fontSize: 16, color: '#00b96b' }} />
                <Text strong style={{ fontSize: 14 }}>Room Management</Text>
              </div>

              <div style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block' }}>
                  Active Room
                </Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Select
                    style={{ flex: 1, minWidth: 150 }}
                    placeholder={loadingRooms ? "Loading rooms..." : "Choose a room"}
                    loading={loadingRooms}
                    value={roomCode}
                    onChange={handleRoomChange}
                    size="small"
                  >
                    {rooms.map((r) => (
                      <Option key={r.code} value={r.code}>
                        {r.name} <code>({r.code})</code>
                      </Option>
                    ))}
                  </Select>
                  {isAdmin && (
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={openEdit}
                      title="Edit Room"
                    />
                  )}
                </div>
              </div>

              {roomName && (
                <div style={{
                  background: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16
                }}>
                  <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                    {roomName}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    Code: <code style={{ background: '#e9ecef', padding: '2px 6px', borderRadius: 4 }}>{roomCode}</code>
                  </Text>
                  {isAdmin && (
                    <div style={{ marginTop: 6 }}>
                      <Tag color="green" style={{ fontSize: 11 }}>Admin</Tag>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Divider style={{ margin: '16px 0' }} />

            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                block
                icon={<LogoutOutlined />}
                onClick={() => logout({ returnTo: window.location.origin })}
              >
                Log Out
              </Button>

              <Button
                block
                danger
                type="text"
                icon={<CloseOutlined />}
                onClick={() => setIsConfirmVisible(true)}
              >
                Leave Room
              </Button>
            </Space>
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
