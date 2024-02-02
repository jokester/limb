export interface ClientCommandBase {
  to?: (`room:${string}` | `socket:${string}`)[];
  timestamp: string;
  nonce?: string; // can be used to match messages with responses
  from?: string; // sender's Socket id (automatically added by server)
}

export interface ClientCommands extends Record<string, ClientCommandBase> {
  '_room:join': ClientCommandBase & {room: string};
  '_room:leave': ClientCommandBase & {room: string};
  '_sys:ping': ClientCommandBase & {timestamp: string};
}

export interface ServerCommands {
  '_sys:welcome': {socketId: string};
  '_sys:pong': ClientCommandBase;
}
