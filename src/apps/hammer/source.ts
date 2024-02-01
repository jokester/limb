import Hammer from 'hammerjs';
import {Observable} from 'rxjs';

const evNames = [
  'tap',
  'doubletap',
  'pan',
  'swipe',
  'press',
  'pinch',
  'rotate',
];

export function createHammerEventSource(
  elem: HTMLElement,
  enablePinchRotate = true
): Observable<HammerInput> {
  return new Observable<HammerInput>(subscriber => {
    const hammertime = new Hammer.Manager(elem);
    if (enablePinchRotate) {
      hammertime.get('pinch').set({enable: true});
      hammertime.get('rotate').set({enable: true});
    }
    hammertime.get('pan').set({direction: Hammer.DIRECTION_ALL});
    hammertime.get('swipe').set({direction: Hammer.DIRECTION_VERTICAL});

    hammertime.on(evNames.join(' '), ev => {
      subscriber.next(ev);
    });

    return () => {
      hammertime.destroy();
    };
  });
}
