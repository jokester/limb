export interface MessageBase {
  timestamp: string; // sender's local time
  nonce?: string; // can be used to match messages with responses
}

/**
 * Messages used to control server
 */
export interface ClientCommands extends Record<string, MessageBase> {
  // maybe allow user to set a sticky message. Server will send this to all other socket (existing or new) sockets.
  // each socket will only have one sticky message at a time
  'user:setStick': MessageBase;
  // set a secret, only messages with the secret can be forwarded to other sockets
  // the secret effectively makes the namespace one-directional
  'namespace:setBroadcastSecret': MessageBase & {secret: string};
  // TODO: is this really useful? using a new namespace just seems simpler
  // need real application to test the idea
  'room:join': MessageBase & {room: string};
  'room:leave': MessageBase & {room: string};
  // ping server to check if it's alive & estimate latency
  'sys:ping': MessageBase;
}

/**
 * Message originated from server
 */
export interface ServerCommands {
  'sys:welcome': {socketId: string};
  'sys:pong': MessageBase;
  'sys:reply': MessageBase & {successful: boolean; message?: string};
}

/**
 * Messages forwarded between clients
 */
export interface ClientMessage extends MessageBase {
  /**
   *
   */
  to?: (`room:${string}` | `socket:${string}`)[];
  /**
   * sender's Socket id (automatically added by server)
   */
  from?: string;
  /**
   * only exists if the message is forwarded via a room
   * automatically added by server
   */
  viaRoom?: string;
}
