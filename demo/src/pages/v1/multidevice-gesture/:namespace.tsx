import {PageProps} from '../../_shared';
import {HammerTouchDemo} from '../../../apps/v1/hammer/demo';
import {useRandomId} from '../../../hooks/use-random-id';

export function MultiDeviceGesturePage(props: PageProps<{namespace: string}>) {
  const ownId = useRandomId(undefined, 8);
  return (
    <div className="container">
      namespace: {props.matches!.namespace}
      <hr />
      <HammerTouchDemo
        namespace={props.matches!.namespace}
        ownClientId={ownId}
      />
    </div>
  );
}
