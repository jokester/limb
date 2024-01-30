import debug from 'debug';
import {useState} from 'preact/compat';
import {useAsyncEffect} from '@jokester/ts-commonutil/lib/react/hook/use-async-effect';
import {PageProps} from '../page-props';
import {startConn} from '../../conn';

const logger = debug('app:connPage');

export function ConnPage(props: PageProps<{uuid: string}>) {
  logger('connPage', props);
  const lines = useState<string[]>(() => []);

  useAsyncEffect(
    async (running, released) => {
      const stopConn = startConn();
      await released;
      stopConn();
    },
    [],
    true
  );

  return (
    <div>
      <div>conn id: {props.matches!.uuid}</div>
    </div>
  );
}
