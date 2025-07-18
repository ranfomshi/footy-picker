import create from 'zustand';

const useStore = create((set) => ({
  hasJoinedRoom: false,
  roomCode: '',
  roomName: '',
  teamAColor: '#1890ff', // Default blue
  teamBColor: '#f5222d', // Default red
  openGameweek: null, // This will track the currently open gameweek
  setHasJoinedRoom: (hasJoinedRoom) => set({ hasJoinedRoom }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setRoomName: (roomName) => set({ roomName }),
  setTeamColors: (teamAColor, teamBColor) => set({ teamAColor, teamBColor }),
  setRoomMembership: (hasJoinedRoom, roomCode, roomName, teamAColor, teamBColor) => set({ 
    hasJoinedRoom, 
    roomCode, 
    roomName,
    teamAColor: teamAColor || '#1890ff',
    teamBColor: teamBColor || '#f5222d'
  }),

  // New actions for gameweek
  setOpenGameweek: (openGameweek) => set({ openGameweek }),
}));

export default useStore;
