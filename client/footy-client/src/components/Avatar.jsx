import React, { useState } from 'react';
import { Avatar, Button, Image, message, Modal, Space, Typography } from 'antd';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';
import useStore from '../useStore';
import ScoringGuide from './ScoringGuide';


const Avatar = () => {
  const { user } = useAuth0();
 

  

  

  return (
    
    
     <Image src={user.picture} preview={false} style={{borderRadius:'75px', margin:30, height:75, width:75}}/>
  )  
};

export default Avatar;
