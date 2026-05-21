import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { ChatModel } from '../models/chat.model';

const router = Router();

// Get chat history for a booking
router.get('/:bookingId', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const messages = await ChatModel.getMessagesByBooking(bookingId);
    
    res.json({
      success: true,
      data: messages.map(msg => ({
        id: msg.id,
        bookingId: msg.booking_id,
        senderId: msg.sender_id,
        senderRole: msg.sender_role,
        text: msg.text,
        audioBase64: msg.audio_base64,
        isSeen: msg.is_seen,
        time: new Date(msg.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: msg.created_at
      }))
    });
  } catch (error: any) {
    console.error('[ChatRoute] Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch chat history' });
  }
});

export default router;
