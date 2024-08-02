import create from 'zustand';

const useStore = create((set) => ({
  hasJoinedRoom: false,
  roomCode: '',
  setHasJoinedRoom: (hasJoinedRoom) => set({ hasJoinedRoom }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setRoomMembership: (hasJoinedRoom, roomCode) => set({ hasJoinedRoom, roomCode }),
}));

export default useStore;
