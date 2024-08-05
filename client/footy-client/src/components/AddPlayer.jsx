import React, { useState, useEffect } from "react";
import { Input, Button, List, Modal, Spin, message, Dropdown, Menu, Space, Tooltip } from "antd";
import { MoreOutlined, PlusOutlined, CheckCircleOutlined } from "@ant-design/icons";
import axios from "axios";
import PlayerDetails from "./PlayerDetails";
import { useAuth0 } from "@auth0/auth0-react";
import { SearchOutline } from 'antd-mobile-icons'; // Import the new icon

const AddPlayer = () => {
  const { getAccessTokenSilently } = useAuth0();
  const [newPlayerName, setNewPlayerName] = useState("");
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editingPlayerName, setEditingPlayerName] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState(null);
  const [players, setPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const fetchPlayers = async () => {
    setLoadingPlayers(true);
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get(`${API_BASE_URL}/players`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const sortedPlayers = response.data.sort((a, b) => a.id - b.id);
      setPlayers(sortedPlayers);
      setFilteredPlayers(sortedPlayers);
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
  
    setLoading(true);
    try {
      const token = await getAccessTokenSilently();
      await axios.post(
        `${API_BASE_URL}/players`,
        { name: newPlayerName }, // Only send name for unlinked players
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setNewPlayerName("");
      fetchPlayers();
      setIsAddModalVisible(false);
      message.success("Player added successfully");
    } catch (error) {
      console.error("Error adding player", error);
      message.error(error.response?.data?.error || "Error adding player");
    } finally {
      setLoading(false);
    }
  };
  
  const showDeleteModal = (player) => {
    setPlayerToDelete(player);
    setIsDeleteModalVisible(true);
  };

  const handleDelete = async () => {
    if (!playerToDelete) return;
    setLoading(true);
    try {
      const token = await getAccessTokenSilently();
      await axios.delete(`${API_BASE_URL}/players/${playerToDelete.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchPlayers();
      setIsDeleteModalVisible(false);
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
      const token = await getAccessTokenSilently();
      await axios.put(
        `${API_BASE_URL}/players/${editingPlayer.id}`,
        { name: editingPlayerName },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
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

  const viewPlayerDetails = (playerId) => {
    const player = players.find((p) => p.id === playerId);
    setSelectedPlayer(player);
    setIsDetailsModalVisible(true);
  };

  const closePlayerDetails = () => {
    setSelectedPlayer(null);
    setIsDetailsModalVisible(false);
  };

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    setFilteredPlayers(
      players.filter((player) =>
        player.name.toLowerCase().includes(term)
      )
    );
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  return (
    <Spin spinning={loading}>
         <div style={{width:50, position:'fixed', bottom:80, right:10, height:80, textAlign:"right", zIndex:2000}}>  <Button
          type="primary"
          shape="circle"
          icon={<PlusOutlined />}
          size="large"
          style={{
        
            zIndex: 1000,
          }}
          onClick={() => setIsAddModalVisible(true)}
        /></div>
      
      <div style={{ maxWidth: "100vw", position: "relative", padding: "1em" }}>
        <Space direction="vertical" style={{ width: "100%" }}>
        <Space direction="horizontal" align="baseline"><SearchOutline/><Input
            placeholder="Search players"
            value={searchTerm}
            onChange={handleSearch}
            style={{ marginBottom: "1em", flexGrow:2 }}
            
          /></Space>
          <Spin spinning={loadingPlayers}>
            <List
              className="scroll-list"
              style={{maxHeight:'60vh'}}
              dataSource={filteredPlayers}
              renderItem={(player) => (
                <List.Item style={{ height: 45 }}>
                  <img
                    height={40}
                    width={40}
                    src="/shirt.svg"
                    alt="Player Shirt"
                    onClick={() => viewPlayerDetails(player.id)}
                    style={{ cursor: "pointer" }}
                  />
                  <div
                    style={{ flexGrow: 1, cursor: "pointer" }}
                    onClick={() => viewPlayerDetails(player.id)}
                  >
                    {player.name}{" "}
                    {player.auth0Id && (
                      <Tooltip title="Player linked to user">
                        <CheckCircleOutlined onClick={(e) => e.stopPropagation()}  style={{ color: "green", transform: 'translateY(1px)' }} />
                      </Tooltip>
                    )}
                  </div>
                  <Dropdown
                    overlay={
                      <Menu>
                        <Menu.Item onClick={() => editPlayer(player)}>Edit</Menu.Item>
                        <Menu.Item onClick={() => showDeleteModal(player)}>Delete</Menu.Item>
                      </Menu>
                    }
                  >
                    <Button
                      style={{ marginRight: 8 }}
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
        </Space>
       
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
          <Modal
            title={<div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', width: '100%' }}>{selectedPlayer.name} <div style={{ color: "gray", fontSize: 'smaller', marginRight: 32 }}>(id:{selectedPlayer.id})</div></div>}
            visible={isDetailsModalVisible}
            footer={null}
            onCancel={closePlayerDetails}
          >
            <PlayerDetails player={selectedPlayer} />
          </Modal>
        )}
        <Modal
          title="Confirm Delete"
          visible={isDeleteModalVisible}
          onOk={handleDelete}
          onCancel={() => setIsDeleteModalVisible(false)}
          okButtonProps={{ danger: true }}
          okText="Delete"
        >
          <p>Are you sure you want to delete this player? This action cannot be undone.</p>
        </Modal>
      </div>
    </Spin>
  );
};

export default AddPlayer;
