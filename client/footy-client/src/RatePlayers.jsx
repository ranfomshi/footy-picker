import React, { useState, useEffect } from 'react';
import { List, InputNumber, Button, DatePicker, message } from 'antd';
import axios from 'axios';
import moment from 'moment';

const RatePlayers = ({ players }) => {
  const [date, setDate] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);

  useEffect(() => {
    if (date) {
      fetchAvailablePlayers(date);
    }
  }, [date]);

  const fetchAvailablePlayers = async (selectedDate) => {
    try {
      const response = await axios.get('/api/availability', { params: { date: selectedDate } });
      setAvailablePlayers(response.data.map(a => a.Player));
    } catch (error) {
      console.error("Error fetching available players", error);
    }
  };

  const recordRatings = async () => {
    try {
      await axios.post('/api/ratings', { date, ratings });
      message.success('Ratings recorded successfully');
      setRatings([]);
      setDate(null);
    } catch (error) {
      console.error("Error recording ratings", error);
      message.error('Failed to record ratings');
    }
  };

  const handleRatingChange = (playerId, value) => {
    setRatings(ratings => {
      const existingRating = ratings.find(r => r.playerId === playerId);
      if (existingRating) {
        return ratings.map(r => r.playerId === playerId ? { ...r, rating: value } : r);
      } else {
        return [...ratings, { playerId, rating: value }];
      }
    });
  };

  return (
    <div>
      <DatePicker
        onChange={(date, dateString) => setDate(dateString)}
        disabledDate={current => current && current > moment().endOf('day')}
        value={date ? moment(date) : null}
      />
      {availablePlayers.length > 0 && (
        <List
          bordered
          dataSource={availablePlayers}
          renderItem={player => (
            <List.Item key={player.id}>
              {player.name}
              <InputNumber
                min={1}
                max={10}
                onChange={value => handleRatingChange(player.id, value)}
              />
            </List.Item>
          )}
        />
      )}
      <Button onClick={recordRatings} type="primary" style={{ marginTop: '10px' }}>
        Record Ratings
      </Button>
    </div>
  );
};

export default RatePlayers;
