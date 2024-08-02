import create from 'zustand';

const useStore = create((set) => ({
  hasJoinedRoom: false,
  roomCode: '',
  roomName: '',
  setHasJoinedRoom: (hasJoinedRoom) => set({ hasJoinedRoom }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setRoomName: (roomName) => set({ roomName }),
  setRoomMembership: (hasJoinedRoom, roomCode, roomName) => set({ hasJoinedRoom, roomCode, roomName }),
}));

export default useStore;
