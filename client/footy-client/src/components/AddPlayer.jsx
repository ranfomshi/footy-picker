import React, { useState, useEffect } from "react";
import { Input, Button, List, Modal, Spin, message, Dropdown, Menu } from "antd";
import { MoreOutlined, PlusOutlined } from "@ant-design/icons";
import axios from "axios";
import PlayerDetails from "./PlayerDetails";

const AddPlayer = () => {
  const [newPlayerName, setNewPlayerName] = useState("");
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editingPlayerName, setEditingPlayerName] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

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
    if (!newPlayerName.trim()) {
      message.error("Player name cannot be empty");
      return;
    }

    const duplicatePlayer = players.find(
      (player) => player.name.toLowerCase() === newPlayerName.toLowerCase()
    );
    if (duplicatePlayer) {
      message.error("Player name already exists");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/players`, { name: newPlayerName });
      setNewPlayerName("");
      fetchPlayers();
      setIsAddModalVisible(false);
      message.success("Player added successfully");
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
      message.success("Player deleted successfully");
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
    if (!editingPlayerName.trim()) {
      message.error("Player name cannot be empty");
      return;
    }

    const duplicatePlayer = players.find(
      (player) =>
        player.name.toLowerCase() === editingPlayerName.toLowerCase() &&
        player.id !== editingPlayer.id
    );
    if (duplicatePlayer) {
      message.error("Player name already exists");
      return;
    }

    setLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/players/${editingPlayer.id}`, {
        name: editingPlayerName,
      });
      setIsModalVisible(false);
      setEditingPlayer(null);
      setEditingPlayerName("");
      fetchPlayers();
      message.success("Player updated successfully");
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

  const viewPlayerDetails = (player) => {
    setSelectedPlayer(player);
  };

  const closePlayerDetails = () => {
    setSelectedPlayer(null);
  };

  useEffect(() => {
    fetchPlayers();
  }, [selectedPlayer]);

  return (
    <Spin spinning={loading}>
      <div style={{ maxWidth: "100vw", position: "relative", padding: "1em" }}>
        <Spin spinning={loadingPlayers}>
          <List
            className="scroll-list"
            dataSource={players}
            renderItem={(player) => (
              <List.Item style={{ height: 45 }}>
                <img
                  height={40}
                  width={40}
                  src="/shirt.svg"
                  alt="Player Shirt"
                  onClick={() => viewPlayerDetails(player)}
                  style={{ cursor: "pointer" }}
                />
                <div
                  style={{ flexGrow: 1, cursor: "pointer" }}
                  onClick={() => viewPlayerDetails(player)}
                >
                  {player.name}
                </div>
                <Dropdown
                  overlay={
                    <Menu>
                      <Menu.Item onClick={() => editPlayer(player)}>Edit</Menu.Item>
                      <Menu.Item onClick={() => deletePlayer(player.id)}>Delete</Menu.Item>
                    </Menu>
                  }
                >
                  <Button
                    icon={<MoreOutlined />}
                    size="small"
                    type="ghost"
                    onClick={(e) => e.stopPropagation()}
                  />
                </Dropdown>
              </List.Item>
            )}
          />
        </Spin>
        <Button
          type="primary"
          shape="circle"
          icon={<PlusOutlined />}
          size="large"
          style={{
            position: "fixed",
            bottom: "2em",
            right: "2em",
            zIndex: 1000,
          }}
          onClick={() => setIsAddModalVisible(true)}
        />
        <Modal
          title="Add Player"
          visible={isAddModalVisible}
          onOk={addPlayer}
          onCancel={() => setIsAddModalVisible(false)}
        >
          <Input
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyPress={handleAddPlayerKeyPress}
            placeholder="Enter player name"
          />
        </Modal>
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
        {selectedPlayer && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'white',
            padding: '2em',
            zIndex: 1001,
          }}>
            <PlayerDetails player={selectedPlayer} onClose={closePlayerDetails} />
          </div>
        )}
      </div>
    </Spin>
  );
};

export default AddPlayer;
