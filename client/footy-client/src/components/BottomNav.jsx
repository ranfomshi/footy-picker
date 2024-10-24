import React from 'react';
import { TabBar } from 'antd-mobile';
import { UserOutline, CalendarOutline, PieOutline, SetOutline } from 'antd-mobile-icons'; // Import the new icon
import { useAuth0 } from '@auth0/auth0-react';
import useStore from '../useStore';
import { Button } from 'antd';

const BottomNav = ({ activeKey, onChange }) => {
    const {logout, isAuthenticated, user } = useAuth0();
    const { hasJoinedRoom } = useStore();
    // Define styles for the active tab
    const activeTabStyle = {
        color: '#00b96b', // Your custom color for the selected tab
    };

    return (isAuthenticated && hasJoinedRoom ?
        <TabBar style={{zIndex:9}} activeKey={activeKey} onChange={onChange}>
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
            <TabBar.Item 
                key="account" 
                icon={<SetOutline />} 
                title="Account" 
                style={activeKey === 'account' ? activeTabStyle : {}}
            />
        </TabBar> : 
                
              isAuthenticated && <Button  onClick={() => logout({ returnTo: window.location.origin })} block>Log Out</Button> 
              
              
           
    );
};

export default BottomNav;
