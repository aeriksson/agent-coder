/**
 * Zustand store for managing agent calls and real-time events
 */

import React from 'react';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { CallSummary, CallEvent, Agent } from './agentClient';
import { agentClient, getEventType } from './agentClient';

interface CallSubscription {
  callId: string;
  close: () => void;
}

interface ResourceMetadata {
  loading: boolean;
  error: string | null;
  notFound: boolean;
  lastFetch: Date | null;
}

interface CallStore {
  // State
  agents: Record<string, Agent>;
  agentsMeta: Record<string, ResourceMetadata>;
  calls: Record<string, CallSummary>;
  callsMeta: Record<string, ResourceMetadata>;
  events: Record<string, CallEvent[]>;
  eventsMeta: Record<string, ResourceMetadata>;
  subscriptions: Record<string, CallSubscription>;

  // Actions
  setAgents: (agents: Record<string, Agent>) => void;
  setAgentError: (agentName: string, error: string, notFound?: boolean) => void;
  updateCall: (call: CallSummary) => void;
  setCallError: (callId: string, error: string, notFound?: boolean) => void;
  setCallLoading: (callId: string, loading: boolean) => void;
  addEvent: (event: CallEvent) => void;
  setCallEvents: (callId: string, events: CallEvent[]) => void;
  setEventsError: (callId: string, error: string, notFound?: boolean) => void;
  setEventsLoading: (callId: string, loading: boolean) => void;
  subscribeToCall: (callId: string) => void;
  unsubscribeFromCall: (callId: string) => void;
  clearCall: (callId: string) => void;

  // Getters
  getCallEvents: (callId: string) => CallEvent[];
  getActiveSubscriptions: () => string[];
}

export const useCallStore = create<CallStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    agents: {},
    agentsMeta: {},
    calls: {},
    callsMeta: {},
    events: {},
    eventsMeta: {},
    subscriptions: {},

    // Actions
    setAgents: (agents) => set((state) => ({
      agents,
      agentsMeta: Object.keys(agents).reduce((acc, name) => ({
        ...acc,
        [name]: {
          loading: false,
          error: null,
          notFound: false,
          lastFetch: new Date()
        }
      }), state.agentsMeta)
    })),

    setAgentError: (agentName, error, notFound = false) => set((state) => ({
      agentsMeta: {
        ...state.agentsMeta,
        [agentName]: {
          loading: false,
          error,
          notFound,
          lastFetch: new Date()
        }
      }
    })),

    updateCall: (call) => set((state) => ({
      calls: {
        ...state.calls,
        [call.id]: call
      },
      callsMeta: {
        ...state.callsMeta,
        [call.id]: {
          loading: false,
          error: null,
          notFound: false,
          lastFetch: new Date()
        }
      }
    })),

    setCallError: (callId, error, notFound = false) => set((state) => ({
      callsMeta: {
        ...state.callsMeta,
        [callId]: {
          loading: false,
          error,
          notFound,
          lastFetch: new Date()
        }
      }
    })),

    setCallLoading: (callId, loading) => set((state) => ({
      callsMeta: {
        ...state.callsMeta,
        [callId]: {
          ...state.callsMeta[callId],
          loading,
          lastFetch: loading ? state.callsMeta[callId]?.lastFetch || null : new Date()
        }
      }
    })),

    addEvent: (event) => set((state) => {
      const callId = event.call_id;
      const existingEvents = state.events[callId] || [];

      // Create a map of existing events by ID for fast lookup
      const existingEventsMap = new Map(existingEvents.map(e => [e.id, e]));

      // Add/update the new event (upsert by ID)
      existingEventsMap.set(event.id, event);

      // Convert back to array and sort chronologically
      const updatedEvents = Array.from(existingEventsMap.values()).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      return {
        events: {
          ...state.events,
          [callId]: updatedEvents
        }
      };
    }),

    setCallEvents: (callId, events) => set((state) => {
      const existingEvents = state.events[callId] || [];

      // Create a map of existing events by ID for fast lookup
      const existingEventsMap = new Map(existingEvents.map(e => [e.id, e]));

      // Merge new events with existing ones (upsert by ID)
      const mergedEventsMap = new Map(existingEventsMap);
      for (const event of events) {
        mergedEventsMap.set(event.id, event);
      }

      // Convert back to array and sort chronologically
      const mergedEvents = Array.from(mergedEventsMap.values()).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      return {
        events: {
          ...state.events,
          [callId]: mergedEvents
        },
        eventsMeta: {
          ...state.eventsMeta,
          [callId]: {
            loading: false,
            error: null,
            notFound: false,
            lastFetch: new Date()
          }
        }
      };
    }),

    setEventsError: (callId, error, notFound = false) => set((state) => ({
      eventsMeta: {
        ...state.eventsMeta,
        [callId]: {
          loading: false,
          error,
          notFound,
          lastFetch: new Date()
        }
      }
    })),

    setEventsLoading: (callId, loading) => set((state) => ({
      eventsMeta: {
        ...state.eventsMeta,
        [callId]: {
          ...state.eventsMeta[callId],
          loading,
          lastFetch: loading ? state.eventsMeta[callId]?.lastFetch || null : new Date()
        }
      }
    })),

    subscribeToCall: (callId) => {
      const state = get();

      if (state.subscriptions[callId]) {
        return;
      }

      const call = state.calls[callId];
      if (call && (call.status === 'completed' || call.status === 'failed' || call.status === 'cancelled')) {
        return;
      }

      try {
        const subscription = agentClient.subscribeToCall(callId);

        (async () => {
          try {
            for await (const event of subscription.events) {
              get().addEvent(event);

              const eventType = getEventType(event);
              if (eventType === 'status_change' && 'new_status' in event) {
                const currentCall = get().calls[callId];
                if (currentCall) {
                  get().updateCall({
                    ...currentCall,
                    status: event.new_status
                  });
                }
              }
            }
          } catch (error) {
            console.error(`Error in event stream for call ${callId}:`, error);
          }
        })();

        (async () => {
          try {
            for await (const error of subscription.errors) {
              console.error(`WebSocket error for call ${callId}:`, error);
            }
          } catch (error) {
            console.error(`Error in error stream for call ${callId}:`, error);
          }
        })();

        set((state) => ({
          subscriptions: {
            ...state.subscriptions,
            [callId]: {
              callId,
              close: subscription.close
            }
          }
        }));

      } catch (error) {
        console.error(`Failed to subscribe to call ${callId}:`, error);
      }
    },

    unsubscribeFromCall: (callId) => set((state) => {
      const subscription = state.subscriptions[callId];
      if (subscription) {
        subscription.close();

        const { [callId]: removed, ...remainingSubscriptions } = state.subscriptions;
        return {
          subscriptions: remainingSubscriptions
        };
      }
      return state;
    }),

    clearCall: (callId) => set((state) => {
      const subscription = state.subscriptions[callId];
      if (subscription) {
        subscription.close();
      }

      const { [callId]: removedCall, ...remainingCalls } = state.calls;
      const { [callId]: removedCallMeta, ...remainingCallsMeta } = state.callsMeta;
      const { [callId]: removedEvents, ...remainingEvents } = state.events;
      const { [callId]: removedEventsMeta, ...remainingEventsMeta } = state.eventsMeta;
      const { [callId]: removedSubscription, ...remainingSubscriptions } = state.subscriptions;

      return {
        calls: remainingCalls,
        callsMeta: remainingCallsMeta,
        events: remainingEvents,
        eventsMeta: remainingEventsMeta,
        subscriptions: remainingSubscriptions
      };
    }),

    // Getters
    getCallEvents: (callId) => {
      const state = get();
      return state.events[callId] || [];
    },

    getActiveSubscriptions: () => {
      const state = get();
      return Object.keys(state.subscriptions);
    }
  }))
);

// Cleanup subscriptions on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const state = useCallStore.getState();
    Object.values(state.subscriptions).forEach(sub => sub.close());
  });
}