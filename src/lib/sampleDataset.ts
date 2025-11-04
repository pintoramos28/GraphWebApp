import type { EncodingDataset } from './encodingTypes';

export const SAMPLE_DATASET: EncodingDataset = {
  id: 'sample',
  name: 'Quality Metrics Sample',
  fields: [
    {
      fieldId: 'sprint',
      name: 'sprint',
      label: 'Sprint',
      type: 'string'
    },
    {
      fieldId: 'team',
      name: 'team',
      label: 'Team',
      type: 'string'
    },
    {
      fieldId: 'defects',
      name: 'defects',
      label: 'Defects Found',
      type: 'number'
    },
    {
      fieldId: 'hours',
      name: 'hours',
      label: 'Engineering Hours',
      type: 'number',
      unit: 'hours'
    }
  ],
  rows: [
    { sprint: 'Alpha', defects: 4, hours: 120, team: 'Aurora' },
    { sprint: 'Beta', defects: 7, hours: 150, team: 'Aurora' },
    { sprint: 'Gamma', defects: 3, hours: 110, team: 'Aurora' },
    { sprint: 'Alpha', defects: 6, hours: 118, team: 'Nimbus' },
    { sprint: 'Beta', defects: 8, hours: 170, team: 'Nimbus' },
    { sprint: 'Gamma', defects: 5, hours: 140, team: 'Nimbus' },
    { sprint: 'Alpha', defects: 2, hours: 90, team: 'Zenith' },
    { sprint: 'Beta', defects: 4, hours: 105, team: 'Zenith' },
    { sprint: 'Gamma', defects: 3, hours: 112, team: 'Zenith' }
  ]
};
