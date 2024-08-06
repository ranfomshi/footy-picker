import React from 'react';
import { Typography, Card, List, Divider } from 'antd';

const { Title, Paragraph, Text } = Typography;

const ScoringGuide = () => (
  <Card >
    <Typography>
      <Title level={2}>Scoring System Guide for Players</Title>
      <Paragraph>
        Welcome to our scoring system guide! Here you will find an explanation of how points are awarded to players based on their performance in games. This system is designed to ensure fairness and to motivate players to perform their best during each gameweek.
      </Paragraph>

      <Title level={3}>Gameweek Points Calculation</Title>
      <Paragraph>
        For each gameweek, players can earn points based on the game result and their team's performance. The points are calculated as follows:
      </Paragraph>

      <Title level={4}>Basic Points</Title>
      <List
        dataSource={[
          "Winning Team: Each player on the winning team earns 3 points.",
          "Draw: Each player on both teams earns 1 point.",
          "Losing Team: Players on the losing team do not earn points from the game result."
        ]}
        renderItem={item => <List.Item>{item}</List.Item>}
      />

      <Title level={4}>Goal-Based Points</Title>
      <Paragraph>Players also earn points based on the goals scored by their team and the goals conceded by the opposing team. These points vary depending on whether the game was balanced (equal number of players on both teams) or handicapped (unequal number of players).</Paragraph>

      <Title level={5}>Balanced Game</Title>
      <List
        dataSource={[
          "For each goal scored by the player's team: 0.2 points per goal.",
          "For each goal conceded by the player's team: -0.1 points per goal."
        ]}
        renderItem={item => <List.Item>{item}</List.Item>}
      />

      <Title level={5}>Handicapped Game</Title>
      <List
        dataSource={[
          "For the team with more players:",
          " - 0.1 points per goal scored.",
          " - -0.1 points per goal conceded.",
          "For the team with fewer players:",
          " - 0.2 points per goal scored.",
          " - -0.1 points per goal conceded."
        ]}
        renderItem={item => <List.Item>{item}</List.Item>}
      />

      <Title level={4}>Example Calculation</Title>
      <Paragraph>
        Let's say Team A wins against Team B with a score of 5-3, and both teams have an equal number of players. Here is how the points would be awarded:
      </Paragraph>

      <Title level={5}>Team A (Winning Team)</Title>
      <List
        dataSource={[
          "Game result points: 3 points per player.",
          "Goal points:",
          " - Goals scored (5 goals): 5 x 0.2 = 1 point.",
          " - Goals conceded (3 goals): 3 x -0.1 = -0.3 points.",
          "Total points per player on Team A: 3 + 1 - 0.3 = 3.7 points."
        ]}
        renderItem={item => <List.Item>{item}</List.Item>}
      />

      <Title level={5}>Team B (Losing Team)</Title>
      <List
        dataSource={[
          "Game result points: 0 points per player.",
          "Goal points:",
          " - Goals scored (3 goals): 3 x 0.2 = 0.6 points.",
          " - Goals conceded (5 goals): 5 x -0.1 = -0.5 points.",
          "Total points per player on Team B: 0 + 0.6 - 0.5 = 0.1 points."
        ]}
        renderItem={item => <List.Item>{item}</List.Item>}
      />

      <Title level={3}>Player Ratings</Title>
      <Paragraph>
        Each player's rating is updated based on their performance points. The ratings are calculated as follows:
      </Paragraph>
      <List
        dataSource={[
          "Earned Points: Players accumulate points over each gameweek.",
          "Recent Performance: The sum of points from the player's last 5 gameweeks is used.",
          "Overall Rating: This sum is used to update the player's overall rating."
        ]}
        renderItem={item => <List.Item>{item}</List.Item>}
      />

      <Title level={4}>How Ratings Impact Future Games</Title>
      <List
        dataSource={[
          "Balanced Teams: Teams are picked to be as balanced as possible based on player ratings.",
          "Motivation: Higher ratings can be a motivation to perform better and contribute positively to the team's success."
        ]}
        renderItem={item => <List.Item>{item}</List.Item>}
      />

      <Title level={3}>Special Scenarios</Title>
      <Title level={4}>Unlinked Players</Title>
      <List
        dataSource={[
          "They can still participate in games and earn points.",
          "The points and ratings will be stored until the player is linked to an account."
        ]}
        renderItem={item => <List.Item>{item}</List.Item>}
      />

      <Title level={4}>Handicapped Games</Title>
      <List
        dataSource={[
          "Teams with fewer players have a scoring advantage to balance the game.",
          "Players on the handicapped team can earn more points per goal scored compared to players on the team with more players."
        ]}
        renderItem={item => <List.Item>{item}</List.Item>}
      />

      <Title level={3}>Conclusion</Title>
      <Paragraph>
        Our scoring system is designed to be fair and motivating. It rewards players for both team success and individual contributions. We hope this guide helps you understand how points and ratings are calculated, and motivates you to achieve your best performance in every gameweek.
      </Paragraph>
      <Paragraph>Happy playing!</Paragraph>
      <Paragraph>
        If you have any questions or need further clarification, please feel free to reach out to our support team.
      </Paragraph>
    </Typography>
  </Card>
);

export default ScoringGuide;
