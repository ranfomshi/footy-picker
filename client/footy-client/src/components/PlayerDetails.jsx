import React, { useEffect, useState } from "react";
import { Spin, Button, Input, Form, message } from "antd";
import axios from "axios";

const PlayerDetails = ({ player, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [editingPlayerName, setEditingPlayerName] = useState(player.name);
  const [form] = Form.useForm();

  const API_BASE_URL =
    process.env.NODE_ENV === "production"
      ? "https://footy-picker-58753c2f9639.herokuapp.com/api"
      : "http://localhost:5000/api";

  const updatePlayer = async () => {
    if (!editingPlayerName.trim()) {
      message.error("Player name cannot be empty");
      return;
    }

    setLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/players/${player.id}`, {
        name: editingPlayerName,
      });
      message.success("Player updated successfully");
      onClose();
    } catch (error) {
      console.error("Error updating player", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setEditingPlayerName(player.name);
  }, [player]);

  return (
    <Spin spinning={loading}>
      <div>
        <h2>Player Details</h2>
        <p><strong>ID:</strong> {player.id}</p>
        <p><strong>Created At:</strong> {new Date(player.createdAt).toLocaleDateString()}</p>
        <Form form={form} layout="vertical" onFinish={updatePlayer}>
          <Form.Item label="Edit Player Name">
            <Input
              value={editingPlayerName}
              onChange={(e) => setEditingPlayerName(e.target.value)}
              placeholder="Enter new player name"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Update
            </Button>
            <Button onClick={onClose} style={{ marginLeft: 8 }}>
              Close
            </Button>
          </Form.Item>
        </Form>
      </div>
    </Spin>
  );
};

export default PlayerDetails;
