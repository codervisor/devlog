export interface DevlogEvent {
  type:
    | 'created'
    | 'updated'
    | 'deleted'
    | 'note-added'
    | 'completed'
    | 'closed'
    | 'archived'
    | 'unarchived';
  timestamp: string;
  data: any;
}

export type DevlogEventHandler = (event: DevlogEvent) => void | Promise<void>;
