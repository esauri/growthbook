import { NamespaceValue } from "./feature";

export type ImplementationType = "visual" | "code" | "configuration" | "custom";

export type DomChange = {
  selector: string;
  action: "append" | "set" | "remove";
  attribute: string;
  value: string;
};

export interface Screenshot {
  path: string;
  width?: number;
  height?: number;
  description?: string;
}

export interface Variation {
  name: string;
  description?: string;
  value?: string;
  key?: string;
  screenshots: Screenshot[];
  css?: string;
  dom?: DomChange[];
}

export interface ExperimentPhase {
  dateStarted: Date;
  dateEnded?: Date;
  phase: "ramp" | "main" | "holdout";
  reason: string;
  coverage: number;
  variationWeights: number[];
  condition?: string;
  namespace?: NamespaceValue;
  /**
   * @deprecated
   */
  groups?: string[];
}

export type ExperimentPhaseStringDates = Omit<
  ExperimentPhase,
  "dateStarted" | "dateEnded"
> & {
  dateStarted?: string;
  dateEnded?: string;
};

export type ExperimentStatus = "draft" | "running" | "stopped";

export type AttributionModel = "firstExposure" | "allExposures";

export interface ExperimentInterface {
  id: string;
  trackingKey: string;
  organization: string;
  project?: string;
  owner: string;
  datasource: string;
  exposureQueryId: string;
  implementation: ImplementationType;
  hashAttribute?: string;
  /**
   * @deprecated
   */
  userIdType?: "anonymous" | "user";
  name: string;
  dateCreated: Date;
  dateUpdated: Date;
  tags: string[];
  description?: string;
  /**
   * @deprecated
   */
  observations?: string;
  hypothesis?: string;
  metrics: string[];
  guardrails?: string[];
  activationMetric?: string;
  segment?: string;
  queryFilter?: string;
  skipPartialData?: boolean;
  removeMultipleExposures?: boolean;
  attributionModel?: AttributionModel;
  autoAssign: boolean;
  previewURL: string;
  targetURLRegex: string;
  variations: Variation[];
  archived: boolean;
  status: ExperimentStatus;
  phases: ExperimentPhase[];
  results?: "dnf" | "won" | "lost" | "inconclusive";
  winner?: number;
  analysis?: string;
  data?: string;
  lastSnapshotAttempt?: Date;
  nextSnapshotAttempt?: Date;
  autoSnapshots: boolean;
  ideaSource?: string;
}

export type ExperimentFeatureSummary = Pick<
  ExperimentInterface,
  | "id"
  | "trackingKey"
  | "hashAttribute"
  | "name"
  | "variations"
  | "archived"
  | "status"
  | "phases"
  | "results"
  | "winner"
>;

export type ExperimentInterfaceStringDates = Omit<
  ExperimentInterface,
  "dateCreated" | "dateUpdated" | "phases"
> & {
  dateCreated: string;
  dateUpdated: string;
  phases: ExperimentPhaseStringDates[];
};
