import {v4 as genUuid} from 'uuid';
import {useEffect, useState} from 'preact/compat';

export function IndexPage(props: {path?: string}) {
  const [uuid, setUuid] = useState<null | string>(null);

  useEffect(() => {
    setUuid(genUuid());
  }, []);

  if (uuid) {
    return (
      <div>
        join random topic:
        <a href={`/topics/${uuid}`}>{uuid}</a>
      </div>
    );
  }
  return <div>loading...</div>;
}
