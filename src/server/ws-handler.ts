import { Server, Socket } from 'socket.io';
import { roomManager, LiveParticipant } from './room-manager.js';
import {
  findRoomByCode,
  joinRoom,
  activateRoom,
  endRoom,
  getParticipant,
  pushRecentRoom,
} from '../db/queries.js';
import { handleTranslation } from './voice-pipeline.js';

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join_room', async (data: {
      roomCode: string;
      userId: string;
    }) => {
      try {
        const { roomCode, userId } = data;
        const upperCode = roomCode.toUpperCase();

        const dbRoom = await findRoomByCode(upperCode);
        if (!dbRoom) {
          socket.emit('error_msg', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
          return;
        }

        const participant = await getParticipant(userId);
        if (!participant) {
          socket.emit('error_msg', { code: 'NO_PROFILE', message: 'Profile not found' });
          return;
        }

        // Determine role
        let role: 'creator' | 'joiner';
        if (dbRoom.creatorUserId === userId) {
          role = 'creator';
        } else if (dbRoom.joinerUserId === userId) {
          role = 'joiner';
        } else if (!dbRoom.joinerUserId && dbRoom.status === 'waiting') {
          await joinRoom(upperCode, userId, participant.displayName, participant.language, participant.dialect);
          role = 'joiner';
        } else {
          socket.emit('error_msg', { code: 'ROOM_FULL', message: 'Room is full' });
          return;
        }

        // Ensure room exists in live state
        let liveRoom = roomManager.getRoom(upperCode);
        if (!liveRoom) {
          liveRoom = roomManager.createRoom(upperCode, dbRoom._id.toString());
        }

        // If this user already has a socket in the room (page refresh), clean it up
        const existing = roomManager.getParticipant(upperCode, userId);
        if (existing) {
          existing.participant.socket.leave(upperCode);
        }

        const liveParticipant: LiveParticipant = {
          userId,
          displayName: participant.displayName,
          language: participant.language,
          dialect: participant.dialect,
          voiceId: participant.voiceId,
          socket,
        };
        roomManager.addParticipant(upperCode, role, liveParticipant);

        socket.join(upperCode);

        const partner = roomManager.getPartner(upperCode, userId);
        socket.emit('room_joined', {
          roomCode: upperCode,
          status: dbRoom.status,
          partnerName: partner?.displayName,
          partnerLanguage: partner?.language,
          yourRole: role,
        });

        if (partner) {
          partner.socket.emit('partner_joined', {
            partnerName: participant.displayName,
            partnerLanguage: participant.language,
          });

          // Both users connected — activate room if not already active
          const room = roomManager.getRoom(upperCode);
          if (room?.creator && room?.joiner && dbRoom.status !== 'active') {
            await activateRoom(dbRoom._id);

            // Push recent room for both users
            await Promise.all([
              pushRecentRoom(room.creator.userId, upperCode, room.joiner.displayName),
              pushRecentRoom(room.joiner.userId, upperCode, room.creator.displayName),
            ]);

            io.to(upperCode).emit('room_active', {});
          }
        }
      } catch (err) {
        console.error('join_room error:', err);
        socket.emit('error_msg', { code: 'JOIN_ERROR', message: 'Failed to join room' });
      }
    });

    socket.on('phrase_recognized', async (data: {
      roomCode: string;
      userId: string;
      text: string;
      isFinal: boolean;
    }) => {
      const { roomCode, userId, text, isFinal } = data;
      const upperCode = roomCode.toUpperCase();
      const partner = roomManager.getPartner(upperCode, userId);
      if (!partner) return;

      if (!isFinal) {
        partner.socket.emit('partner_typing', { isSpeaking: true, partialText: text });
        return;
      }

      partner.socket.emit('partner_typing', { isSpeaking: false });
      await handleTranslation(upperCode, userId, text);
    });

    socket.on('send_text', async (data: { roomCode: string; userId: string; text: string }) => {
      const { roomCode, userId, text } = data;
      if (!text.trim()) return;
      const upperCode = roomCode.toUpperCase();
      const partner = roomManager.getPartner(upperCode, userId);
      if (!partner) return;

      await handleTranslation(upperCode, userId, text.trim());
    });

    socket.on('typing', (data: { roomCode: string; userId: string; isTyping: boolean }) => {
      const partner = roomManager.getPartner(data.roomCode.toUpperCase(), data.userId);
      if (partner) {
        partner.socket.emit('partner_typing', { isSpeaking: false, isTyping: data.isTyping });
      }
    });

    socket.on('end_room', async (data: { roomCode: string; userId: string }) => {
      try {
        const { roomCode, userId } = data;
        const upperCode = roomCode.toUpperCase();

        const dbRoom = await findRoomByCode(upperCode);
        if (dbRoom) await endRoom(dbRoom._id);

        io.to(upperCode).emit('room_ended', { endedBy: userId });
        roomManager.removeRoom(upperCode);
      } catch (err) {
        console.error('end_room error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      const result = roomManager.disconnectUser(socket.id);
      if (result?.partnerSocket) {
        result.partnerSocket.emit('partner_disconnected', {});
      }
    });
  });
}
