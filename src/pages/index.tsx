import {v4 as genUuid} from 'uuid';
import {useEffect, useState} from 'preact/compat';
import {PageProps} from './page-props';

export function IndexPage(props: PageProps) {
  const [uuid, setUuid] = useState<null | string>(null);

  useEffect(() => {
    setUuid(genUuid());
  }, []);

  return (
    <div>
      <h1>Limb: a socket.io signaling server</h1>
      <p>It can be used to forward between peers</p>
      {uuid ? (
        <>
          <div>
            join a random room in /v1 namespace:
            <a href={`/v1/${uuid}`}>{uuid}</a>
          </div>
          <div>
            join a random room in /v2 namespace:
            <a href={`/v2/${uuid}`}>{uuid}</a>
          </div>
        </>
      ) : (
        <div>loading ...</div>
      )}
    </div>
  );
}
