import create from 'zustand';

const useStore = create((set) => ({
  hasJoinedRoom: false,
  roomCode: '',
  roomName: '',
  openGameweek: null, // This will track the currently open gameweek
  setHasJoinedRoom: (hasJoinedRoom) => set({ hasJoinedRoom }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setRoomName: (roomName) => set({ roomName }),
  setRoomMembership: (hasJoinedRoom, roomCode, roomName) => set({ hasJoinedRoom, roomCode, roomName }),
  
  // New actions for gameweek
  setOpenGameweek: (openGameweek) => set({ openGameweek }),
}));

export default useStore;
