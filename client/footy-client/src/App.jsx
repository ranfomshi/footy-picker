import React, { useState, useEffect } from 'react';
import { Tabs, Layout, List } from 'antd';
import axios from 'axios';
import AddPlayer from './AddPlayer';
import RecordAvailability from './RecordAvailability';
import PickTeams from './PickTeams';
import RatePlayers from './RatePlayers';

const { TabPane } = Tabs;
const { Header, Content } = Layout;

const App = () => {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await axios.get('/api/players');
      console.log("Fetched players:", response.data);
      if (Array.isArray(response.data)) {
        setPlayers(response.data);
      } else {
        console.error("Expected an array but got:", response.data);
      }
    } catch (error) {
      console.error("Error fetching players", error);
    }
  };

  return (
    <Layout style={{ maxWidth: '500px', margin: '0 auto' }}>
      <Header style={{ background: '#fff', textAlign: 'center', padding: 0 }}>
        <h1>Football Team Picker</h1>
      </Header>
      <Content style={{ padding: '0 50px', marginTop: '20px' }}>
        <Tabs defaultActiveKey="1">
          <TabPane tab="Add Player" key="1">
            <AddPlayer fetchPlayers={fetchPlayers} />
            <List
              bordered
              dataSource={players}
              renderItem={player => (
                <List.Item key={player.id}>{player.name}</List.Item>
              )}
            />
          </TabPane>
          <TabPane tab="Record Availability" key="2">
            <RecordAvailability players={players} fetchPlayers={fetchPlayers} />
          </TabPane>
          <TabPane tab="Pick Teams" key="3">
            <PickTeams />
          </TabPane>
          <TabPane tab="Rate Players" key="4">
            <RatePlayers players={players} />
          </TabPane>
        </Tabs>
      </Content>
    </Layout>
  );
};

export default App;
