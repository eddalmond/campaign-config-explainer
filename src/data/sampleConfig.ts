import type { CampaignConfig } from '../types/campaign';

/**
 * Minimal sample config used by the "Try a sample" button.
 *
 * Deliberately exercises every shape the visualiser knows about so first-time
 * users immediately see:
 *   - all 5 rule types (F, S, R, X, Y)
 *   - all 3 attribute levels (PERSON, TARGET, COHORT)
 *   - the Y/D prefix date operators with NVL fallback
 *   - the in operator on a code attribute
 *   - MemberOf on a COHORT_LABEL rule
 *   - a <<DATE_DAY_*>> template token in a date
 *   - one CommsRouting code that's intentionally missing from the ActionsMapper
 *     so the validation panel shows a real warning
 */
export const SAMPLE_CONFIG: CampaignConfig = {
  ID: 'SAMPLE_Vaccination_Config',
  Version: 1,
  Name: 'Sample Vaccination Config',
  Type: 'V',
  Target: 'RSV',
  Manager: ['example@nhs.net'],
  Approver: ['example@nhs.net'],
  Reviewer: ['example@nhs.net'],
  IterationFrequency: 'X',
  IterationType: 'O',
  IterationTime: '<<TIME_HOUR_1>>',
  StartDate: '20250101',
  EndDate: '20261231',
  ApprovalMinimum: 0,
  ApprovalMaximum: 0,
  DefaultCommsRouting: 'PLACEHOLDER',
  Iterations: [
    {
      ID: 'sample-iter-1',
      DefaultCommsRouting: 'INFO_TEXT',
      DefaultNotEligibleRouting: 'NOT_ELIGIBLE_INFO',
      DefaultNotActionableRouting: 'NOT_ACTIONABLE_INFO',
      Version: 1,
      Name: 'Sample iteration — week 1',
      IterationDate: '<<DATE_DAY_-100>>',
      IterationNumber: 1,
      CommsType: 'I',
      ApprovalMinimum: 0,
      ApprovalMaximum: 0,
      Type: 'O',
      StatusText: {
        Actionable: 'You are eligible. Book now.',
        NotActionable: 'You may not be able to book right now.',
        NotEligible: 'You are not currently eligible.',
      },
      IterationCohorts: [
        {
          CohortLabel: 'sample_cohort',
          CohortGroup: 'demo',
          PositiveDescription: 'are in the sample cohort',
          NegativeDescription: 'are not in the sample cohort',
          Priority: 0,
          Virtual: 'N',
        },
      ],
      IterationRules: [
        // F rule — date operator with NVL fallback (TARGET level)
        {
          Type: 'F',
          Name: 'Already vaccinated',
          Description: 'Remove from the cohort if vaccinated within the last 10 years.',
          Priority: 100,
          AttributeLevel: 'TARGET',
          AttributeTarget: 'RSV',
          AttributeName: 'LAST_SUCCESSFUL_DATE',
          Operator: 'Y>=',
          Comparator: '-10[[NVL:18000101]]',
        },
        // F rule — days operator, no NVL (PERSON level)
        {
          Type: 'F',
          Name: 'No future booking',
          Description: 'Remove if there is no future appointment booked.',
          Priority: 110,
          AttributeLevel: 'TARGET',
          AttributeTarget: 'RSV',
          AttributeName: 'BOOKED_APPOINTMENT_DATE',
          Operator: 'D<',
          Comparator: '0',
        },
        // S rule — flag with `=` (PERSON level)
        {
          Type: 'S',
          Name: 'Care home setting',
          Description: '## Care home\n\nSpeak to a member of staff at your care home.',
          Priority: 200,
          AttributeLevel: 'PERSON',
          AttributeName: 'CARE_HOME_FLAG',
          Operator: '=',
          Comparator: 'Y',
          RuleStop: 'Y',
        },
        // S rule — COHORT level with MemberOf
        {
          Type: 'S',
          Name: 'Demo suppression',
          Description: 'Suppress if person is in the demo cohort.',
          Priority: 210,
          AttributeLevel: 'COHORT',
          AttributeName: 'COHORT_LABEL',
          Operator: 'MemberOf',
          Comparator: 'sample_cohort',
          RuleStop: 'Y',
        },
        // R rule — `in` operator on a code attribute
        {
          Type: 'R',
          Name: 'In a participating region',
          Description: 'Route to the booking page if the person is in a participating region.',
          Priority: 1000,
          AttributeLevel: 'PERSON',
          AttributeName: 'ICB',
          Operator: 'in',
          Comparator: 'QH8,QJG,QWE',
          CommsRouting: 'INFO_TEXT',
        },
        // R rule — date operator on TARGET
        {
          Type: 'R',
          Name: 'Future booking',
          Description: 'Route to manage-booking if there is a future appointment.',
          Priority: 1100,
          AttributeLevel: 'TARGET',
          AttributeTarget: 'RSV',
          AttributeName: 'BOOKED_APPOINTMENT_DATE',
          Operator: 'D>=',
          Comparator: '0',
          CommsRouting: 'MANAGE_BOOKING',
        },
        // R rule — AND group: same Type+Priority+Name as "In a participating region".
        // Both must match for the routing to fire (demonstrates the AND-group
        // mention in the rule sentence).
        {
          Type: 'R',
          Name: 'In a participating region',
          Description: 'AND group: the person must also have a care home flag set.',
          Priority: 1000,
          AttributeLevel: 'PERSON',
          AttributeName: 'CARE_HOME_FLAG',
          Operator: '=',
          Comparator: 'Y',
          CommsRouting: 'INFO_TEXT',
        },
        // X rule — no CommsRouting on purpose to show validation panel
        {
          Type: 'X',
          Name: 'Not eligible (intentionally unrouted)',
          Description: 'This X rule has no CommsRouting to demonstrate validation.',
          Priority: 2000,
          AttributeLevel: 'PERSON',
          AttributeName: 'ICB',
          Operator: 'in',
          Comparator: 'QQ9',
        },
        // Y rule — references a routing code that doesn't exist in ActionsMapper
        {
          Type: 'Y',
          Name: 'Other setting',
          Description: 'Route to the "other setting" copy.',
          Priority: 3000,
          AttributeLevel: 'PERSON',
          AttributeName: 'CARE_HOME_FLAG',
          Operator: '=',
          Comparator: 'Y',
          CommsRouting: 'GHOST_ACTION',
        },
      ],
      ActionsMapper: {
        INFO_TEXT: {
          ExternalRoutingCode: 'InfoText',
          ActionDescription: '### Sample info\n\nThis is a sample action. Edit me in Author mode!',
          ActionType: 'InfoText',
          UrlLink: null,
          UrlLabel: '',
        },
        MANAGE_BOOKING: {
          ExternalRoutingCode: 'ManageBooking',
          ActionDescription: '### Manage your booking\n\nView, change, or cancel your appointment.',
          ActionType: 'ButtonWithAuthLink',
          UrlLink: 'https://example.org/manage',
          UrlLabel: 'Manage appointment',
        },
        NOT_ELIGIBLE_INFO: {
          ExternalRoutingCode: 'NotEligibleInfo',
          ActionDescription: '### Not eligible\n\nSpeak to your healthcare professional.',
          ActionType: 'InfoText',
          UrlLink: null,
          UrlLabel: '',
        },
        NOT_ACTIONABLE_INFO: {
          ExternalRoutingCode: 'NotActionableInfo',
          ActionDescription: '### Not actionable\n\nYou may not be able to book right now.',
          ActionType: 'InfoText',
          UrlLink: null,
          UrlLabel: '',
        },
      },
    },
  ],
};

/**
 * Empty starter config. Useful for the "Blank config" quick start — gives
 * users a working scaffold (1 iteration, no rules, no cohorts, no actions)
 * that they can fill in from scratch in Author mode.
 */
export const BLANK_CONFIG: CampaignConfig = {
  ID: 'NEW_CAMPAIGN',
  Version: 1,
  Name: 'New campaign',
  Type: 'V',
  Target: '',
  IterationFrequency: 'X',
  StartDate: '',
  EndDate: '',
  DefaultCommsRouting: '',
  Iterations: [
    {
      ID: 'new-iter-1',
      Version: 1,
      Name: 'Iteration 1',
      IterationDate: '',
      IterationNumber: 1,
      Type: 'O',
      IterationCohorts: [],
      IterationRules: [],
      ActionsMapper: {},
    },
  ],
};
