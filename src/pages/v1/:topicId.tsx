import debug from 'debug';
import {useState} from 'preact/compat';
import {useAsyncEffect} from '@jokester/ts-commonutil/lib/react/hook/use-async-effect';
import {PageProps} from '../page-props';
import {connectV1, ClientCommands} from '../../namespaces/v1/client';
import {v4 as genUuid} from 'uuid';
import {wait} from '@jokester/ts-commonutil/lib/concurrency/timing';

const logger = debug('app:connPage');

export function V1RoomPage(props: PageProps<{topicId: string}>) {
  logger('connPage', props);
  const [lines, setLines] = useState<string[]>(() => []);
  const [clientId] = useState(() => genUuid().slice(0, 8));

  useAsyncEffect(
    async (running, released) => {
      const {close, send} = connectV1<ClientCommands>(clientId, {
        ping(msg: ClientCommands['ping']) {
          logger('got msg', msg);
          setLines(prev => {
            return [...prev, `${msg.clientId}: ping at ${msg.timestamp}`].slice(
              -20
            );
          });
        },
        connect() {
          send('subscribe', {
            clientId,
            topicId: props.matches!.topicId,
          });
        },
      });
      while (running.current) {
        send('ping', {
          clientId: clientId,
          topicId: props.matches!.topicId,
          timestamp: new Date().toJSON(),
        });
        await wait(2e3);
      }
      close();
    },
    [clientId, props.matches!.topicId],
    true
  );

  return (
    <div>
      <div>topic id: {props.matches!.topicId}</div>
      <div>client id: {clientId}</div>
      <hr />
      <div className="h-64 overflow-y">
        {lines.map(l => (
          <p key={l}>{l}</p>
        ))}
      </div>
    </div>
  );
}
