export interface ClientCommandBase {
  to?: (`room:${string}` | `socket:${string}`)[];
  timestamp: string;
  nonce?: string; // can be used to match messages with responses
  from?: string; // sender's Socket id (automatically added by server)
}

export interface ClientCommands extends Record<string, ClientCommandBase> {
  'room:join': ClientCommandBase & {room: string};
  'room:leave': ClientCommandBase & {room: string};
  'sys:ping': ClientCommandBase;
}

export interface ServerCommands {
  'sys:welcome': {socketId: string};
  'sys:pong': ClientCommandBase;
}
