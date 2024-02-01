export interface ClientCommands extends Record<string, ClientCommandBase> {
  subscribe: ClientCommandBase & {topicId: string};
  ping: ClientCommandBase & {timestamp: string};
}

export interface ClientCommandBase {
  clientId: string;
  topicId: string;
}
