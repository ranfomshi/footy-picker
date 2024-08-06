import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import '../App.css'

const UserAvatar = () => {
    const { user } = useAuth0();
  
    const getInitials = (name) => {
      const nameArray = name.split(' ');
      const initials = nameArray.map(n => n[0]).join('');
      return initials;
    };
  
    return (
        <div class="gradient-border-circle">
        <div class="inner-circle"><h4 className='gradient-text'>{getInitials(user.name)}</h4></div>
    </div>
    );
  };
  
  export default UserAvatar;