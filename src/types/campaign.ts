export interface CampaignConfig {
  ID: string;
  Name: string;
  Type: 'V' | 'S' | string;
  Target: string;
  StartDate: string;
  EndDate: string;
  IterationFrequency: string;
  Iterations: Iteration[];
}

export interface Iteration {
  ID: string;
  Name: string;
  IterationDate: string;
  Type: string;
  CommsType?: string;
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
}

export interface Rule {
  Type: 'F' | 'S' | 'R' | 'X' | 'Y';
  Priority: number;
  Name: string;
  Description?: string;
  AttributeLevel?: string;
  AttributeName?: string;
  AttributeTarget?: string;
  Operator?: string;
  Comparator?: string;
  CohortLabel?: string;
  RuleStop?: boolean | 'Y';
  CommsRouting?: string;
}

export interface Cohort {
  Priority: number;
  CohortLabel: string;
  CohortGroup: string;
  Virtual?: 'Y';
  PositiveDescription?: string;
}

export interface ActionMapping {
  ExternalRoutingCode?: string;
  ActionType?: string;
  ActionDescription?: string;
  UrlLink?: string;
  UrlLabel?: string;
}

export interface RulesMapperEntry {
  RuleNames?: string[];
  RuleCode?: string;
  RuleText?: string;
}