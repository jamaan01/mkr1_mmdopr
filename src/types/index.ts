export interface Task {
  id: string;
  name: string;
  duration: number;
  priority: number;
  predecessors: string[];
  requiredSpecializations: string[];
  hours: number;
  assignees: string[];
}

export interface Resource {
  id: string;
  specialization: string;
  availability: number;
}

export interface PlannedTask extends Task {
  plannedDuration: number;
  startDay: number;
  endDay: number;
  startDate: string;
  finishDate: string;
  earlyStart: number;
  lateStart: number;
  reserve: number;
  critical: boolean;
}

export interface Schedule {
  id: string;
  createdAt: string;
  startDate: string;
  finishDate: string;
  duration: number;
  baselineDuration: number;
  order: string[];
  tasks: PlannedTask[];
  resources: Resource[];
  loads: Record<string, number[]>;
  conflicts: string[];
}