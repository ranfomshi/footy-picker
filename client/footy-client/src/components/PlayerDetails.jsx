import React from "react";
import { Card, Button, Descriptions } from "antd";

const PlayerDetails = ({ player, onClose }) => {
  return (
    <Card
      title={`Player Details - ${player.name}`}
     
      style={{ width: "100%", maxWidth: "600px", margin: "0 auto" }}
    >
      <Descriptions bordered column={1}>
        <Descriptions.Item label="ID">{player.id}</Descriptions.Item>
        <Descriptions.Item label="Name">{player.name}</Descriptions.Item>
        <Descriptions.Item label="Rating">{player.rating}</Descriptions.Item>
        <Descriptions.Item label="Wins">{player.wins}</Descriptions.Item>
        <Descriptions.Item label="Draws">{player.draws}</Descriptions.Item>
        <Descriptions.Item label="Losses">{player.losses}</Descriptions.Item>
        <Descriptions.Item label="Goals For">{player.goalsFor}</Descriptions.Item>
        <Descriptions.Item label="Goals Against">{player.goalsAgainst}</Descriptions.Item>
        <Descriptions.Item label="Created At">
          {new Date(player.createdAt).toLocaleDateString()}
        </Descriptions.Item>
      </Descriptions>
      <Button onClick={onClose} style={{marginTop:'8px'}}>Close</Button>
    </Card>
  );
};

export default PlayerDetails;
