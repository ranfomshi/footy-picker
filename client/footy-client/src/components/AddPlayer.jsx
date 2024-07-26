import React, { useState } from 'react';
import { Input, Button, List, Modal, Space } from 'antd';
import axios from 'axios';

const AddPlayer = ({ fetchPlayers, players }) => {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editingPlayerName, setEditingPlayerName] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);

  const addPlayer = async () => {
    try {
      await axios.post('http://localhost:5000/api/players', { name: newPlayerName });
      setNewPlayerName('');
      fetchPlayers();
    } catch (error) {
      console.error("Error adding player", error);
    }
  };

  const deletePlayer = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/players/${id}`);
      fetchPlayers();
    } catch (error) {
      console.error("Error deleting player", error);
    }
  };

  const editPlayer = (player) => {
    setEditingPlayer(player);
    setEditingPlayerName(player.name);
    setIsModalVisible(true);
  };

  const updatePlayer = async () => {
    try {
      await axios.put(`http://localhost:5000/api/players/${editingPlayer.id}`, { name: editingPlayerName });
      setIsModalVisible(false);
      setEditingPlayer(null);
      setEditingPlayerName('');
      fetchPlayers();
    } catch (error) {
      console.error("Error updating player", error);
    }
  };

  const handleAddPlayerKeyPress = (e) => {
    if (e.key === 'Enter') {
      addPlayer();
    }
  };

  const handleUpdatePlayerKeyPress = (e) => {
    if (e.key === 'Enter') {
      updatePlayer();
    }
  };

  return (
    <div style={{ maxWidth: '100vw' }}>
      <div style={{display:'flex', width:'100%', gap:8, marginBottom:8}}>
        <Input
        style={{flexGrow:1}}
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          onKeyPress={handleAddPlayerKeyPress}
          placeholder="Enter player name"
        />
        <Button onClick={addPlayer} type="primary">
          Add Player
        </Button>
      </div>
      <List
      style={{maxHeight:'75vh', overflowY:'scroll'}}
        dataSource={players}
        renderItem={player => (
          <List.Item style={{height:65}}
            actions={[
              <Button onClick={() => editPlayer(player)}>Edit</Button>,
              <Button onClick={() => deletePlayer(player.id)} danger>Delete</Button>
            ]}
          >
            <img height={60} width={60} src='/shirt.svg' alt='Player Shirt'/>
            <div>{player.name}</div>
          </List.Item>
        )}
      />
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
  );
};

export default AddPlayer;
