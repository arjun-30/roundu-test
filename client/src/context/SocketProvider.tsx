// src/context/SocketProvider.tsx
import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { socket } from '@/lib/socket';
import { useApp } from '@/context/AppContext';

interface SocketContextProps {
  socket: typeof socket;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextProps | null>(null);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const state = useApp();
  const { dispatch } = state;
  const isConnectedRef = useRef(false);

  // Register socket on authentication change
  useEffect(() => {
    if (state.isAuthenticated && state.user.id && state.role) {
      if (!socket.connected) {
        socket.connect();
      }
      const register = () => {
        const serviceIds = state.role === 'provider'
          ? state.providerRegistrationDraft?.serviceIds || []
          : [];
        socket.emit('register', {
          userId: state.user.id,
          role: state.role,
          serviceIds,
          lat: state.currentLocation?.lat || (state.user as any).lat || null,
          lng: state.currentLocation?.lng || (state.user as any).lng || null,
          displayLocation: state.user.address || null,
        });
      };
      if (socket.connected) {
        register();
      }
      socket.on('connect', register);
      return () => {
        socket.off('connect', register);
      };
    }
  }, [state.isAuthenticated, state.user.id, state.role]);

  // Global socket listeners – only set once
  useEffect(() => {
    const handleConnect = () => {
      console.log('[SOCKET] connected');
      isConnectedRef.current = true;
    };
    const handleDisconnect = (reason: any) => {
      console.log('[SOCKET] disconnected', reason);
      isConnectedRef.current = false;
    };
    const handleIncomingRequest = (request: any) => {
      console.log('[SOCKET] incoming_request', request);
      dispatch({ type: 'ADD_PROVIDER_REQUEST', request });
      dispatch({ type: 'ENQUEUE_NOTIFICATION', payload: request }); // custom action to enqueue
    };
    const handleNewBookingRequest = (request: any) => {
      console.log('[SOCKET] new_booking_request', request);
      dispatch({ type: 'ADD_PROVIDER_REQUEST', request });
      dispatch({ type: 'ENQUEUE_NOTIFICATION', payload: request });
    };
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('incoming_request', handleIncomingRequest);
    socket.on('new_booking_request', handleNewBookingRequest);
    // other socket listeners (status updates, location, etc.) can stay in AppContext or be moved similarly
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('incoming_request', handleIncomingRequest);
      socket.off('new_booking_request', handleNewBookingRequest);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected: isConnectedRef.current }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};
