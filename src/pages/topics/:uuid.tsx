import debug from 'debug';
import {useState} from 'preact/compat';
import {useAsyncEffect} from '@jokester/ts-commonutil/lib/react/hook/use-async-effect';
import {PageProps} from '../page-props';
import {ClientCommands, startConn} from '../../conn';
import {v4 as genUuid} from 'uuid';
import {wait} from '@jokester/ts-commonutil/lib/concurrency/timing';

const logger = debug('app:connPage');

export function TopicPage(props: PageProps<{uuid: string}>) {
  logger('connPage', props);
  const [lines, setLines] = useState<string[]>(() => []);
  const [clientId] = useState(() => genUuid().slice(0, 8));

  useAsyncEffect(
    async (running, released) => {
      const {close, send} = startConn<ClientCommands>(clientId, {
        ping(msg: ClientCommands['ping']) {
          logger('got msg', msg);
          setLines(prev => {
            return [
              ...prev,
              `${msg.clientId}: ping at ${msg.timestamp}}`,
            ].slice(-10);
          });
        },
        connect() {
          send('subscribe', {
            clientId,
            topicId: props.matches!.uuid,
          });
        },
      });
      while (running.current) {
        send('ping', {
          clientId: clientId,
          topicId: props.matches!.uuid,
          timestamp: new Date().toJSON(),
        });
        await wait(2e3);
      }
      close();
    },
    [clientId, props.matches!.uuid],
    true
  );

  return (
    <div>
      <div>topic id: {props.matches!.uuid}</div>
      <div>client id: {clientId}</div>
      <hr />
      {lines.map(l => (
        <p key={l}>{l}</p>
      ))}
    </div>
  );
}
