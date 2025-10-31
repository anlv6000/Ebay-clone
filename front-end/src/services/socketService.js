import { io } from 'socket.io-client';
import store from '../redux/store';
import {
  addMessage,
  updateOnlineStatus,
  updateTypingStatus,
  incrementUnreadCount
} from '../features/chat/chatSlice';

let socket;

export const initSocketConnection = () => {
  try {
    const state = store.store.getState();
    const token = state.auth.token;
    
    if (!token) {
      console.warn('No authentication token found. Socket connection aborted.');
      return null;
    }
    
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:9999';
    
    // Initialize the socket connection
    socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });
    
    // Setup event listeners
    socket.on('connect', () => {
      console.log('Connected to chat server');
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });
    
    socket.on('newMessage', (message) => {
      const state = store.store.getState();
      const activeConversation = state.chat.activeConversation;
      
      store.store.dispatch(addMessage({
        conversationId: message.conversationId,
        message
      }));
      
      // If not the active conversation, increment unread count
      if (activeConversation !== message.conversationId) {
        store.store.dispatch(incrementUnreadCount({
          conversationId: message.conversationId
        }));
      }
    });
    
    socket.on('userStatus', ({ userId, status }) => {
      store.store.dispatch(updateOnlineStatus({ userId, status }));
    });
    
    socket.on('userTyping', ({ userId, isTyping, conversationId }) => {
      store.store.dispatch(updateTypingStatus({
        userId,
        conversationId,
        isTyping
      }));
    });
    
    socket.on('messagesRead', ({ reader, messageIds, conversationId }) => {
      // Handle messages being marked as read by the other user
    });
    
    socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
    });
    
    return socket;
  } catch (error) {
    console.error('Error initializing socket connection:', error);
    return null;
  }
};

export const joinConversation = (conversationId) => {
  if (!conversationId || !socket || !socket.connected) return;
  
  try {
    socket.emit('joinConversation', conversationId);
  } catch (error) {
    console.error('Error joining conversation:', error);
  }
};

export const leaveConversation = (conversationId) => {
  if (!conversationId || !socket || !socket.connected) return;
  
  try {
    socket.emit('leaveConversation', conversationId);
  } catch (error) {
    console.error('Error leaving conversation:', error);
  }
};

export const sendMessage = (messageData) => {
  if (!messageData || !socket || !socket.connected) return;
  
  try {
    socket.emit('sendMessage', messageData);
  } catch (error) {
    console.error('Error sending message:', error);
  }
};

export const markAsRead = (conversationId, messageIds) => {
  if (!conversationId || !messageIds || !socket || !socket.connected) return;
  
  try {
    socket.emit('markAsRead', { conversationId, messageIds });
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
};

export const sendTypingStatus = (conversationId, isTyping) => {
  if (!conversationId || !socket || !socket.connected) return;
  
  try {
    socket.emit('typing', { conversationId, isTyping });
  } catch (error) {
    console.error('Error sending typing status:', error);
  }
};

export const disconnectSocket = () => {
  if (!socket) return;
  
  try {
    socket.disconnect();
  } catch (error) {
    console.error('Error disconnecting socket:', error);
  }
}; 