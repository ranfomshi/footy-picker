import React, { useState } from 'react';
import { Input, Button } from 'antd';
import axios from 'axios';

const AddPlayer = ({ fetchPlayers }) => {
  const [newPlayerName, setNewPlayerName] = useState('');

  const addPlayer = async () => {
    try {
      await axios.post('/api/players', { name: newPlayerName });
      setNewPlayerName('');
      fetchPlayers(); // Fetch the updated list of players
    } catch (error) {
      console.error("Error adding player", error);
    }
  };

  return (
    <div>
      <Input
        value={newPlayerName}
        onChange={(e) => setNewPlayerName(e.target.value)}
        placeholder="Enter player name"
      />
      <Button onClick={addPlayer} type="primary" style={{ marginTop: '10px' }}>
        Add Player
      </Button>
    </div>
  );
};

export default AddPlayer;
