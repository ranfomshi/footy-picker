import React from "react";
import { Card, Button, Row, Col, Typography, Divider } from "antd";

const { Title, Text } = Typography;

const PlayerDetails = ({ player, onClose }) => {
  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card bordered={false} style={{ textAlign: 'center' }}>
            <Text style={{whiteSpace:'nowrap'}}>Wins:</Text>
            <div><Text strong>{player.wins}</Text></div>
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ textAlign: 'center' }}>
            <Text style={{whiteSpace:'nowrap'}}>Draws:</Text>
            <div><Text strong>{player.draws}</Text></div>
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ textAlign: 'center' }}>
            <Text style={{whiteSpace:'nowrap'}}>Losses:</Text>
            <div><Text size="3rem" strong>{player.losses}</Text></div>
          </Card>
        </Col>
        <Col span={12}>
          <Card bordered={false} style={{ textAlign: 'center' }}>
            <Text style={{whiteSpace:'nowrap'}}>Team Goals For:</Text>
            <div><Text strong>{player.goalsFor}</Text></div>
          </Card>
        </Col>
        <Col span={12}>
          <Card bordered={false} style={{ textAlign: 'center' }}>
            <Text style={{whiteSpace:'nowrap'}}>Team Goals Against:</Text>
            <div><Text strong>{player.goalsAgainst}</Text></div>
          </Card>
        </Col>
        <Col span={24}>
          <Card bordered={false} style={{ textAlign: 'center' }}>
            <Text style={{whiteSpace:'nowrap'}}>Joined:</Text>
            <div><Text strong>{new Date(player.createdAt).toLocaleDateString()}</Text></div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default PlayerDetails;
