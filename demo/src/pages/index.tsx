import {PageProps} from './page-props';
import {useRandomId} from './useRandomId';

export function IndexPage(props: PageProps) {
  const randomNamespace = useRandomId();

  return (
    <div>
      <h1>Limb: a socket.io signaling server</h1>
      <p>It can be used to forward between peers</p>
      {randomNamespace ? (
        <>
          <div>
            join a random room in /v1 namespace:
            <a href={`/v1/${randomNamespace}`}>{randomNamespace}</a>
          </div>
          <div>
            join a random room in /v2 namespace:
            <a href={`/v2/${randomNamespace}`}>{randomNamespace}</a>
          </div>
        </>
      ) : (
        <div>loading ...</div>
      )}
    </div>
  );
}
