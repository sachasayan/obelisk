import { Emitter } from '@socket.io/component-emitter';
import type { DefaultEventsMap } from '@socket.io/component-emitter';
import type { ControllerPeer } from '../../obelisk-server/controller-hub';

export interface BrowserSession {
  attach(namespace: string, peer: ControllerPeer): void;
}
declare global {
  interface Window { obeliskSession?: BrowserSession }
}

// Two event channels preserve the remote's request/reply semantics inside this tab.
export function io(namespaceOrOptions: string | object) {
  const inbound = new Emitter<DefaultEventsMap, DefaultEventsMap>();
  const outbound = new Emitter<DefaultEventsMap, DefaultEventsMap>();
  const namespace = typeof namespaceOrOptions === 'string' ? namespaceOrOptions : '/';
  const peer = { id: crypto.getRandomValues(new Uint32Array(4)).join('-'), on: outbound.on.bind(outbound), emit: inbound.emit.bind(inbound) };
  function leavePage(event: PageTransitionEvent) {
    if (!event.persisted) socket.disconnect();
  }
  const socket = {
    connected: false, active: false,
    on: inbound.on.bind(inbound), off: inbound.off.bind(inbound),
    removeAllListeners: inbound.off.bind(inbound), emit: outbound.emit.bind(outbound),
    connect() {
      if (socket.connected) return;
      const session = window.obeliskSession ?? window.parent.obeliskSession;
      if (!session) { inbound.emit('connect_error'); return; }
      socket.connected = true;
      session.attach(namespace, peer);
      window.addEventListener('pagehide', leavePage);
    },
    disconnect() {
      if (!socket.connected) return;
      socket.connected = false;
      window.removeEventListener('pagehide', leavePage);
      outbound.emit('disconnect');
      outbound.off();
    },
  };
  return socket;
}
