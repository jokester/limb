import {PageProps} from '../../_shared';

export function MultiDeviceGesturePage(props: PageProps<{namespace: string}>) {
  return <div>namespace: {props.matches!.namespace}</div>;
}
