import debug from 'debug';
import {useEffect, useState} from 'react';
import {PageProps} from '../page-props';
import {io} from 'socket.io-client';
import {useSingleton} from 'foxact/use-singleton';

const logger = debug('app:v1:demoPage');

function getDefaultOrigin(): string {
  const isLocalOrigin = ['localhost', '127.0.0.1'].includes(location.hostname);
  const defaultOrigin = isLocalOrigin
    ? 'http://localhost:3000'
    : 'https://limb.jokester.io';
  return defaultOrigin;
}

interface PageState {
  selfId: string;
  state: string;
  logLines: string[];
}

function usePageState(namespace: string): PageState {
  const selfId = useSingleton(() =>
    Math.random().toString(16).slice(2, 10)
  ).current;

  const [state, setState] = useState<PageState>(() => ({
    selfId,
    state: 'init',
    logLines: [],
  }));

  interface PingMessage {
    clientId: string;
    timestamp: string;
  }

  useEffect(() => {
    const defaultOrigin = getDefaultOrigin();
    const socket = io(`${defaultOrigin}/v1/${namespace}`);

    socket.onAny((event, clientEvent, payload) => {
      const now = new Date().toISOString();
      if (['connect', 'disconnect', 'connect_error'].includes(event)) {
        setState(prev => ({
          ...prev,
          state: event,
          logLines: [`${now}: ${event}`, ...prev.logLines].slice(0, 100),
        }));
      } else if (clientEvent === 'ping') {
        const now = new Date().toISOString();
        const ping = payload as PingMessage;
        const delay = (Date.now() - Date.parse(ping.timestamp)).toFixed(2);

        setState(prev => ({
          ...prev,
          logLines: [
            `${now}: received ping from ${ping.clientId}, delay=${delay} ms`,
            ...prev.logLines,
          ].slice(0, 100),
        }));
      } else {
        logger('unhandled event', event, clientEvent, payload);
      }
    });

    const timer = setInterval(() => {
      const now = new Date().toISOString();

      if (socket.connected) {
        socket.volatile.send('ping', {
          clientId: selfId,
          timestamp: new Date().toISOString(),
        } as PingMessage);
        setState(prev => ({
          ...prev,
          logLines: [`${now}: sent ping as ${selfId}`, ...prev.logLines].slice(
            0,
            100
          ),
        }));
      } else {
        setState(prev => ({
          ...prev,
          logLines: [`${now}: unable to sent ping`, ...prev.logLines].slice(
            0,
            100
          ),
        }));
      }
    }, 2e3);

    return () => {
      clearInterval(timer);
      socket.close();
    };
  }, [namespace]);

  return state;
}

export function V1DemoPage(props: PageProps<{namespace: string}>) {
  logger('V1RoomPage', props);
  const namespace = useSingleton(() => props.matches!.namespace).current;
  const {selfId, state, logLines} = usePageState(namespace);

  return (
    <div>
      <div>namespace: {namespace}</div>
      <div>own client id: {selfId}</div>
      <div>connection state: {state}</div>
      <hr />
      <div className="h-64 overflow-y">
        {logLines.map(l => (
          <p key={l}>{l}</p>
        ))}
      </div>
    </div>
  );
}
