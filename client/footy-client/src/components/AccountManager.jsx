import React, { useState, useEffect } from "react";
import { Avatar, Button, Image, message, Modal, Space, Typography, Select, Form, Input } from "antd";
import { EditOutlined } from "@ant-design/icons";
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [form] = Form.useForm();

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
          setIsAdmin(data.activeRoom.isAdmin);
          setHasJoinedRoom(true);
        }
      } catch (err) {
        console.error("Failed to load rooms", err);
        message.error("Could not fetch your rooms");
      } finally {
        setLoadingRooms(false);
      }
    })();
  }, [API_BASE_URL, getAccessTokenSilently, setHasJoinedRoom, setRoomCode, setRoomName]);

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
        setIsAdmin(data.activeRoom.isAdmin);
        setHasJoinedRoom(true);
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
    <div style={{ padding: "20px", maxWidth: "600px", margin: "auto" }}>
      <Title level={2}>Account Management</Title>

      {/* Room switcher with edit icon for admins */}
      <Space align="center" style={{ marginBottom: 20, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <Select
          style={{ flexGrow: 1 }}
          placeholder={loadingRooms ? "Loading rooms..." : "Choose a room"}
          loading={loadingRooms}
          value={roomCode}
          onChange={handleRoomChange}
        >
          {rooms.map((r) => (
            <Option key={r.code} value={r.code}>
              {r.name} <code>({r.code})</code>
            </Option>
          ))}
        </Select>
        {isAdmin && (
          <Button
            icon={<EditOutlined />}
            onClick={openEdit}
          />
        )}
      </Space>

      {/* Edit Room Modal */}
      <Modal
        title="Edit Room"
        visible={isEditVisible}
        onOk={handleEditOk}
        onCancel={() => setIsEditVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Sport" name="sport">
            <Input disabled />
          </Form.Item>
          <Form.Item label="Room Name" name="name" rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Team A Color" name="teamAColor" rules={[{ required: true }]}
          >
            <Input type="color" />
          </Form.Item>
          <Form.Item label="Team B Color" name="teamBColor" rules={[{ required: true }]}
          >
            <Input type="color" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Profile info */}
      <Image
        src={user.picture}
        preview={false}
        style={{ borderRadius: "75px", margin: 30, height: 100, width: 100 }}
      />
      <div>

        <Text>{user.email}</Text>

        <Space direction="vertical" style={{ width: "100%", marginTop: 20 }}>
          <Button block type="primary" onClick={() => setIsModalVisible(true)}>
            View Scoring System
          </Button>
          <Modal
            title="Scoring System Guide"
            visible={isModalVisible}
            onOk={() => setIsModalVisible(false)}
            onCancel={() => setIsModalVisible(false)}
            width="90%"
            style={{ top: 20 }}
            footer={[<Button key="close" onClick={() => setIsModalVisible(false)}>Close</Button>]}
          >
            <ScoringGuide />
          </Modal>
        </Space>

        <Space direction="vertical" style={{ width: "100%", marginTop: "20%" }}>
          <Button
            block
            type="default"
            onClick={() => logout({ returnTo: window.location.origin })}
          >
            Log out
          </Button>

          <Button type="text" block danger onClick={() => setIsConfirmVisible(true)}>
            Leave <b>{roomName} <code>{roomCode}</code></b> room
          </Button>
        </Space>

        <Modal
          title={
            <>Leave Room <b>{roomName} <code>{roomCode}</code></b>?</>
          }
          visible={isConfirmVisible}
          onOk={handleUnlink}
          onCancel={() => setIsConfirmVisible(false)}
          okText="Yes, Leave"
          cancelText="No"
        >
          <p>Are you sure you want to leave the room? This unlinks your profile from the player but leaves the player in the room so you can still take part in games with your group.</p>
        </Modal>
      </div>
    </div>
  );
}
