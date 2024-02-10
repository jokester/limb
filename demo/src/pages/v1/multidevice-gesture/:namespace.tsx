import {PageProps} from '../../_shared';
import {HammerTouchDemo} from '../../../apps/v1/hammer/demo';
import {useRandomId} from '../../../hooks/use-random-id';
import {useFps} from '@jokester/ts-commonutil/lib/react/hook/use-fps';

export function MultiDeviceGesturePage(props: PageProps<{namespace: string}>) {
  const ownId = useRandomId(undefined, 8);
  const fps = useFps(120);
  return (
    <div className="container">
      namespace: {props.matches!.namespace}
      <hr />
      <HammerTouchDemo
        namespace={props.matches!.namespace}
        ownClientId={ownId}
      />
      <hr />
      <p>fps: {fps.toFixed(2)}</p>
    </div>
  );
}
