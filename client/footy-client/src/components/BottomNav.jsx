import React from 'react';
import { TabBar } from 'antd-mobile';
import { UserOutline, CalendarOutline, PieOutline } from 'antd-mobile-icons';

const BottomNav = ({ activeKey, onChange }) => {
    // Define styles for the active tab
    const activeTabStyle = {
        color: '#00b96b', // Your custom color for the selected tab
    };

    return (
        <TabBar activeKey={activeKey} onChange={onChange}>
            <TabBar.Item 
                key="players" 
                icon={<UserOutline />} 
                title="Players" 
                style={activeKey === 'players' ? activeTabStyle : {}}
            />
            <TabBar.Item 
                key="gameweeks" 
                icon={<CalendarOutline />} 
                title="Gameweeks" 
                style={activeKey === 'gameweeks' ? activeTabStyle : {}}
            />
            <TabBar.Item 
                key="playerStats" 
                icon={<PieOutline />} 
                title="Player Stats" 
                style={activeKey === 'playerStats' ? activeTabStyle : {}}
            />
        </TabBar>
    );
};

export default BottomNav;
