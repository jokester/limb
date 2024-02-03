import {PageProps} from '../../_shared';
import {HammerTouchDemo} from '../../../apps/hammer/demo';

export function MultiDeviceGesturePage(props: PageProps<{namespace: string}>) {
  return (
    <div className="container">
      namespace: {props.matches!.namespace}
      <hr />
      <HammerTouchDemo />
    </div>
  );
}
