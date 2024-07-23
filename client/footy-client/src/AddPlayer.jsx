import React, { useState } from 'react';
import { Input, Button } from 'antd';
import axios from 'axios';

const AddPlayer = ({ fetchPlayers, players }) => {
  const [newPlayerName, setNewPlayerName] = useState('');

  const addPlayer = async () => {
  try {
    await axios.post('/players', { name: newPlayerName });
    setNewPlayerName('');
    fetchPlayers();
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
      <ul>
        {players.map(player => (
          <li key={player.id}>{player.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default AddPlayer;
