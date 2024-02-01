interface TouchEvent {}
export function createTouchSource(socketUrl: string): Observable<TouchEvent> {
  return createConnection(socketUrl).pipe(
    switchMap(socket => createEvent<TouchEvent>(socket, 'touch'))
  );
}
