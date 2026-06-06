export type CampaignType = 'V' | 'S' | string;
export type IterationType = 'A' | 'M' | 'S' | 'O' | string;
export type CommsType = string;
export type Frequency = 'X' | 'D' | 'W' | 'M' | 'Q' | 'A' | string;
export type AttributeLevel = 'PERSON' | 'TARGET' | 'COHORT' | string;
export type RuleType = 'F' | 'S' | 'R' | 'X' | 'Y';
export type YN = 'Y' | 'N';

export interface CampaignConfig {
  ID: string;
  Name: string;
  Type: CampaignType;
  Target: string;
  StartDate: string;
  EndDate: string;
  IterationFrequency: Frequency;
  Iterations: Iteration[];

  // Optional fields observed in real configs
  Version?: number;
  Manager?: string[];
  Approver?: string[];
  Reviewer?: string[];
  IterationType?: IterationType;
  IterationTime?: string;
  ApprovalMinimum?: number;
  ApprovalMaximum?: number;
  DefaultCommsRouting?: string;
}

export interface Iteration {
  ID: string;
  Name: string;
  IterationDate: string;
  Type: IterationType;
  CommsType?: CommsType;
  StatusText?: {
    Actionable?: string;
    NotActionable?: string;
    NotEligible?: string;
  };
  DefaultCommsRouting?: string;
  DefaultNotEligibleRouting?: string;
  DefaultNotActionableRouting?: string;
  IterationRules?: Rule[];
  IterationCohorts?: Cohort[];
  ActionsMapper?: Record<string, ActionMapping>;
  RulesMapper?: Record<string, RulesMapperEntry>;

  // Optional fields observed in real configs
  Version?: number;
  IterationNumber?: number;
  ApprovalMinimum?: number;
  ApprovalMaximum?: number;
}

export interface Rule {
  Type: RuleType;
  Priority: number;
  Name: string;
  Description?: string;
  AttributeLevel?: AttributeLevel;
  AttributeName?: string;
  AttributeTarget?: string;
  Operator?: string;
  Comparator?: string;
  CohortLabel?: string;
  RuleStop?: boolean | YN;
  CommsRouting?: string;
}

export interface Cohort {
  Priority: number;
  CohortLabel: string;
  CohortGroup: string;
  Virtual?: YN;
  PositiveDescription?: string;
  NegativeDescription?: string;
}

export interface ActionMapping {
  ExternalRoutingCode?: string;
  ActionType?: string;
  ActionDescription?: string;
  UrlLink?: string | null;
  UrlLabel?: string;
}

export interface RulesMapperEntry {
  RuleNames?: string[];
  RuleCode?: string;
  RuleText?: string;
}
