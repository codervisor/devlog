export interface DevlogEvent {
  type: 'created' | 'updated' | 'deleted' | 'note-added';
  timestamp: string;
  data: any;
}

export type DevlogEventHandler = (event: DevlogEvent) => void | Promise<void>;
