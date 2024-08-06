import React from 'react';
import { Typography, List, Divider, Collapse } from 'antd';

const { Title, Paragraph } = Typography;
const { Panel } = Collapse;

const ScoringGuide = () => (
  <>
    <Typography>
      <Title level={4}>Scoring System Guide</Title>
      <Paragraph>
        Welcome to our scoring system guide! Here you will find an explanation of how points are awarded to players based on their teams' performance. This system is designed to ensure each gameweek is competitive and picking teams is time-efficient.
      </Paragraph>

      <Divider />

      <Paragraph>The points are calculated as follows:</Paragraph>

      <Collapse>
        <Panel header="Basic Points" key="1">
          <List
            dataSource={[
              "Winning Team: Each player on the winning team earns 3 points.",
              "Draw: Each player on both teams earns 1 point.",
              "Losing Team: Players on the losing team do not earn points from the game result."
            ]}
            renderItem={item => <List.Item>{item}</List.Item>}
          />
        </Panel>

        <Panel header="Goal-Based Points" key="2">
          <Paragraph>
            Players also earn points based on the goals scored or conceded by their team. These points vary depending on whether the game was balanced (equal number of players on both teams) or handicapped (unequal number of players).
          </Paragraph>

          <Collapse>
            <Panel header="Balanced Game" key="2.1">
              <List
                dataSource={[
                  "For each goal scored by the player's team: 0.2 points per goal.",
                  "For each goal conceded by the player's team: -0.1 points per goal."
                ]}
                renderItem={item => <List.Item>{item}</List.Item>}
              />
            </Panel>

            <Panel header="Handicapped Game" key="2.2">
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
            </Panel>
          </Collapse>
        </Panel>

        <Panel header="Example Calculation" key="3">
          <Paragraph>
            Let's say Team A wins against Team B with a score of 5-3, and both teams have an equal number of players. Here is how the points would be awarded:
          </Paragraph>

          <Collapse>
            <Panel header="Team A (Winning Team)" key="3.1">
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
            </Panel>

            <Panel header="Team B (Losing Team)" key="3.2">
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
            </Panel>
          </Collapse>
        </Panel>

        <Panel header="Player Ratings" key="4">
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
        </Panel>

        <Panel header="How Ratings Impact Future Games" key="5">
          <List
            dataSource={[
              "Balanced Teams: Teams are picked to be as balanced as possible based on player ratings.",
              "Motivation: Higher ratings can be a motivation to perform better and contribute positively to the team's success."
            ]}
            renderItem={item => <List.Item>{item}</List.Item>}
          />
        </Panel>
      </Collapse>

      <Divider />

      <Paragraph>
        This scoring system is designed to be fair and motivating, but above all else, result in a more fun and time-efficient game.
      </Paragraph>
      <Paragraph>Happy playing!</Paragraph>
    </Typography>
  </>
);

export default ScoringGuide;
