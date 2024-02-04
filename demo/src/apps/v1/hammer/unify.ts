import {map, merge, Observable, Subject} from 'rxjs';
import {SerializedHammerInput} from './remote-source';

export interface UnifiedHammerInput extends SerializedHammerInput {
  latency: number; // computed at receiver side
}

export function createUnifiedSource(
  local$: Observable<SerializedHammerInput>,
  remote$: Observable<SerializedHammerInput>
): Observable<UnifiedHammerInput> {
  const src1: Observable<UnifiedHammerInput> = local$.pipe(
    map(ev => ({...ev, latency: 0}))
  );
  const src2: Observable<UnifiedHammerInput> = remote$.pipe(
    map(ev => {
      const latency = Date.now() - Date.parse(ev.timestamp);
      return {...ev, latency};
    })
  );
  return merge(src1, src2);
}
