export interface ClientCommandBase {
  to?: (`room:${string}` | `socket:${string}`)[];
  timestamp: string;
  nonce?: string; // can be used to match messages with responses
  from?: string; // sender's Socket id (automatically added by server)
}

export interface ClientCommands extends Record<string, ClientCommandBase> {
  join: ClientCommandBase & {room: string};
  leave: ClientCommandBase & {room: string};
  ping: ClientCommandBase & {timestamp: string};
}

export interface ServerCommands {
  welcome: {socketId: string};
  pong: ClientCommandBase;
}
