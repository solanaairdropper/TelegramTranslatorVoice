import { Socket } from 'socket.io';

export interface LiveParticipant {
  userId: string;
  displayName: string;
  language: string;
  dialect?: string;
  voiceId?: string;
  socket: Socket;
}

export interface RoomState {
  roomCode: string;
  roomId: string;
  creator?: LiveParticipant;
  joiner?: LiveParticipant;
}

class RoomManager {
  private rooms = new Map<string, RoomState>();

  createRoom(roomCode: string, roomId: string): RoomState {
    const state: RoomState = { roomCode, roomId };
    this.rooms.set(roomCode, state);
    return state;
  }

  getRoom(roomCode: string): RoomState | undefined {
    return this.rooms.get(roomCode);
  }

  addParticipant(roomCode: string, role: 'creator' | 'joiner', participant: LiveParticipant): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    room[role] = participant;
  }

  getPartner(roomCode: string, userId: string): LiveParticipant | undefined {
    const room = this.rooms.get(roomCode);
    if (!room) return undefined;
    if (room.creator?.userId === userId) return room.joiner;
    if (room.joiner?.userId === userId) return room.creator;
    return undefined;
  }

  getParticipant(roomCode: string, userId: string): { participant: LiveParticipant; role: 'creator' | 'joiner' } | undefined {
    const room = this.rooms.get(roomCode);
    if (!room) return undefined;
    if (room.creator?.userId === userId) return { participant: room.creator, role: 'creator' };
    if (room.joiner?.userId === userId) return { participant: room.joiner, role: 'joiner' };
    return undefined;
  }

  setVoiceId(roomCode: string, userId: string, voiceId: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    if (room.creator?.userId === userId) room.creator.voiceId = voiceId;
    if (room.joiner?.userId === userId) room.joiner.voiceId = voiceId;
  }

  bothHaveVoice(roomCode: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;
    return !!(room.creator?.voiceId && room.joiner?.voiceId);
  }

  removeRoom(roomCode: string): void {
    this.rooms.delete(roomCode);
  }

  disconnectUser(socketId: string): { roomCode: string; userId: string; partnerSocket?: Socket } | undefined {
    for (const [roomCode, room] of this.rooms) {
      if (room.creator?.socket.id === socketId) {
        const partner = room.joiner?.socket;
        const userId = room.creator.userId;
        room.creator = undefined;
        return { roomCode, userId, partnerSocket: partner };
      }
      if (room.joiner?.socket.id === socketId) {
        const partner = room.creator?.socket;
        const userId = room.joiner.userId;
        room.joiner = undefined;
        return { roomCode, userId, partnerSocket: partner };
      }
    }
    return undefined;
  }
}

export const roomManager = new RoomManager();
