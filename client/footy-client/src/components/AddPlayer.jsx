import React, { useState, useEffect } from "react";
import { Input, Button, List, Modal, Space, Spin } from "antd";
import axios from "axios";

const AddPlayer = () => {
  const [newPlayerName, setNewPlayerName] = useState("");
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editingPlayerName, setEditingPlayerName] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  const API_BASE_URL =
    process.env.NODE_ENV === "production"
      ? "https://footy-picker-58753c2f9639.herokuapp.com/api"
      : "http://localhost:5000/api";

  const fetchPlayers = async () => {
    setLoadingPlayers(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/players`);
      setPlayers(response.data.sort((a, b) => a.id - b.id));
    } catch (error) {
      console.error("Error fetching players", error);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const addPlayer = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/players`, { name: newPlayerName });
      setNewPlayerName("");
      fetchPlayers();
    } catch (error) {
      console.error("Error adding player", error);
    } finally {
      setLoading(false);
    }
  };

  const deletePlayer = async (id) => {
    setLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/players/${id}`);
      fetchPlayers();
    } catch (error) {
      console.error("Error deleting player", error);
    } finally {
      setLoading(false);
    }
  };

  const editPlayer = (player) => {
    setEditingPlayer(player);
    setEditingPlayerName(player.name);
    setIsModalVisible(true);
  };

  const updatePlayer = async () => {
    setLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/players/${editingPlayer.id}`, {
        name: editingPlayerName,
      });
      setIsModalVisible(false);
      setEditingPlayer(null);
      setEditingPlayerName("");
      fetchPlayers();
    } catch (error) {
      console.error("Error updating player", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayerKeyPress = (e) => {
    if (e.key === "Enter") {
      addPlayer();
    }
  };

  const handleUpdatePlayerKeyPress = (e) => {
    if (e.key === "Enter") {
      updatePlayer();
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  return (
    <Spin spinning={loading}>
      <div style={{ maxWidth: "100vw" }}>
        <div
          style={{ display: "flex", width: "100%", gap: 8, marginBottom: 8 }}
        >
          <Input
            size="small"
            style={{ flexGrow: 1 }}
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyPress={handleAddPlayerKeyPress}
            placeholder="Enter player name"
          />
          <Button onClick={addPlayer} type="primary" size="small">
            Add Player
          </Button>
        </div>
        <Spin spinning={loadingPlayers}>
          <List
            className="scroll-list"
            dataSource={players}
            renderItem={(player) => (
              <List.Item
                style={{ height: 45 }}
                actions={[
                  <Button onClick={() => editPlayer(player)} size="small">
                    Edit
                  </Button>,
                  <Button
                    onClick={() => deletePlayer(player.id)}
                    danger
                    size="small"
                  >
                    Delete
                  </Button>,
                ]}
              >
                <img
                  height={40}
                  width={40}
                  src="/shirt.svg"
                  alt="Player Shirt"
                />
                <div>{player.name}</div>
              </List.Item>
            )}
          />
        </Spin>
        <Modal
          title="Edit Player"
          visible={isModalVisible}
          onOk={updatePlayer}
          onCancel={() => setIsModalVisible(false)}
        >
          <Input
            value={editingPlayerName}
            onChange={(e) => setEditingPlayerName(e.target.value)}
            onKeyPress={handleUpdatePlayerKeyPress}
            placeholder="Enter new player name"
          />
        </Modal>
      </div>
    </Spin>
  );
};

export default AddPlayer;
