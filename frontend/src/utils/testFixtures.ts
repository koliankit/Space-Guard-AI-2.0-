/**
 * Pre-configured test CSV fixtures for SpaceGuard AI
 * PART 20: Comprehensive Verification of Typed Validation & Blocking Rules
 */

export interface TestFixture {
  id: string
  name: string
  description: string
  expectedStatus: 'PASSED' | 'BLOCKED'
  expectedErrorType?: string
  csvText: string
}

export const TEST_FIXTURES: TestFixture[] = [
  {
    id: 'valid_telemetry',
    name: '1. Valid Flight Telemetry (Pass)',
    description: 'MIL-STD-883 Class S flight batch with 30 components across 3 lots with complete measurements.',
    expectedStatus: 'PASSED',
    csvText: `component_id,lot_id,subsystem,value_0h_ua,value_24h_ua,value_96h_ua,value_168h_ua,static_limit_ua,temperature_c,unit
ISRO-GAGAN-FC-001,LOT-2026-A1,FC,12.4,14.1,16.8,19.2,50,125,uA
ISRO-GAGAN-FC-002,LOT-2026-A1,FC,11.8,13.5,15.9,18.4,50,125,uA
ISRO-GAGAN-FC-003,LOT-2026-A1,FC,12.1,13.9,16.2,18.7,50,125,uA
ISRO-GAGAN-FC-004,LOT-2026-A1,FC,12.9,14.8,17.5,20.1,50,125,uA
ISRO-GAGAN-FC-005,LOT-2026-A1,FC,11.5,13.2,15.4,17.9,50,125,uA
ISRO-GAGAN-FC-006,LOT-2026-A1,FC,13.2,15.1,17.9,20.8,50,125,uA
ISRO-GAGAN-FC-007,LOT-2026-A1,FC,12.0,13.7,16.1,18.5,50,125,uA
ISRO-GAGAN-FC-008,LOT-2026-A1,FC,12.6,14.4,17.0,19.6,50,125,uA
ISRO-GAGAN-FC-009,LOT-2026-A1,FC,11.9,13.6,16.0,18.3,50,125,uA
ISRO-GAGAN-FC-010,LOT-2026-A1,FC,12.3,14.0,16.5,19.0,50,125,uA
ISRO-GAGAN-PWR-001,LOT-2026-B2,PWR,18.5,20.4,23.8,27.1,50,125,uA
ISRO-GAGAN-PWR-002,LOT-2026-B2,PWR,19.1,21.0,24.5,27.9,50,125,uA
ISRO-GAGAN-PWR-003,LOT-2026-B2,PWR,18.2,20.1,23.4,26.8,50,125,uA
ISRO-GAGAN-PWR-004,LOT-2026-B2,PWR,18.8,20.7,24.1,27.5,50,125,uA
ISRO-GAGAN-PWR-005,LOT-2026-B2,PWR,19.4,21.3,24.9,28.3,50,125,uA
ISRO-GAGAN-PWR-006,LOT-2026-B2,PWR,18.0,19.9,23.1,26.4,50,125,uA
ISRO-GAGAN-PWR-007,LOT-2026-B2,PWR,18.6,20.5,23.9,27.2,50,125,uA
ISRO-GAGAN-PWR-008,LOT-2026-B2,PWR,19.2,21.1,24.6,28.0,50,125,uA
ISRO-GAGAN-PWR-009,LOT-2026-B2,PWR,18.4,20.3,23.6,27.0,50,125,uA
ISRO-GAGAN-PWR-010,LOT-2026-B2,PWR,21.4,25.2,31.7,38.9,50,125,uA
ISRO-GAGAN-BAT-001,LOT-2026-C3,BAT,8.5,9.2,10.4,11.8,50,125,uA
ISRO-GAGAN-BAT-002,LOT-2026-C3,BAT,8.8,9.5,10.8,12.2,50,125,uA
ISRO-GAGAN-BAT-003,LOT-2026-C3,BAT,8.2,8.9,10.1,11.5,50,125,uA
ISRO-GAGAN-BAT-004,LOT-2026-C3,BAT,8.9,9.6,10.9,12.4,50,125,uA
ISRO-GAGAN-BAT-005,LOT-2026-C3,BAT,8.4,9.1,10.3,11.7,50,125,uA
ISRO-GAGAN-BAT-006,LOT-2026-C3,BAT,8.7,9.4,10.7,12.1,50,125,uA
ISRO-GAGAN-BAT-007,LOT-2026-C3,BAT,8.3,9.0,10.2,11.6,50,125,uA
ISRO-GAGAN-BAT-008,LOT-2026-C3,BAT,8.6,9.3,10.5,12.0,50,125,uA
ISRO-GAGAN-BAT-009,LOT-2026-C3,BAT,8.1,8.8,10.0,11.4,50,125,uA
ISRO-GAGAN-BAT-010,LOT-2026-C3,BAT,28.5,36.2,45.8,54.2,50,125,uA`
  },
  {
    id: 'invalid_missing_column',
    name: '2. Missing Column (lot_id)',
    description: 'Header omits mandatory lot_id column. Triggers MISSING_REQUIRED_COLUMN error and blocks AI screening.',
    expectedStatus: 'BLOCKED',
    expectedErrorType: 'MISSING_REQUIRED_COLUMN',
    csvText: `component_id,subsystem,value_0h_ua,value_24h_ua,value_96h_ua,value_168h_ua,static_limit_ua
ISRO-GAGAN-FC-001,FC,12.4,14.1,16.8,19.2,50
ISRO-GAGAN-FC-002,FC,11.8,13.5,15.9,18.4,50
ISRO-GAGAN-FC-003,FC,12.1,13.9,16.2,18.7,50`
  },
  {
    id: 'invalid_numeric_value',
    name: '3. Invalid Numeric ("abc")',
    description: 'Row 3 contains non-numeric string "abc" in value_24h_ua. Triggers INVALID_NUMERIC_VALUE error.',
    expectedStatus: 'BLOCKED',
    expectedErrorType: 'INVALID_NUMERIC_VALUE',
    csvText: `component_id,lot_id,subsystem,value_0h_ua,value_24h_ua,value_96h_ua,value_168h_ua,static_limit_ua
ISRO-GAGAN-FC-001,LOT-2026-A1,FC,12.4,14.1,16.8,19.2,50
ISRO-GAGAN-FC-002,LOT-2026-A1,FC,11.8,13.5,15.9,18.4,50
ISRO-GAGAN-FC-003,LOT-2026-A1,FC,12.1,abc,16.2,18.7,50
ISRO-GAGAN-FC-004,LOT-2026-A1,FC,12.9,14.8,17.5,20.1,50`
  },
  {
    id: 'invalid_missing_burn_in',
    name: '4. Missing Burn-In Point (EMPTY)',
    description: 'Row 3 has empty string for mandatory value_168h_ua measurement. Triggers MISSING_BURN_IN_POINT error.',
    expectedStatus: 'BLOCKED',
    expectedErrorType: 'MISSING_BURN_IN_POINT',
    csvText: `component_id,lot_id,subsystem,value_0h_ua,value_24h_ua,value_96h_ua,value_168h_ua,static_limit_ua
ISRO-GAGAN-FC-001,LOT-2026-A1,FC,12.4,14.1,16.8,19.2,50
ISRO-GAGAN-FC-002,LOT-2026-A1,FC,11.8,13.5,15.9,18.4,50
ISRO-GAGAN-FC-003,LOT-2026-A1,FC,12.1,13.9,16.2,,50
ISRO-GAGAN-FC-004,LOT-2026-A1,FC,12.9,14.8,17.5,20.1,50`
  },
  {
    id: 'invalid_duplicate_id',
    name: '5. Duplicate Component ID',
    description: 'Component ID ISRO-GAGAN-FC-001 appears twice. Triggers DUPLICATE_COMPONENT_ID error.',
    expectedStatus: 'BLOCKED',
    expectedErrorType: 'DUPLICATE_COMPONENT_ID',
    csvText: `component_id,lot_id,subsystem,value_0h_ua,value_24h_ua,value_96h_ua,value_168h_ua,static_limit_ua
ISRO-GAGAN-FC-001,LOT-2026-A1,FC,12.4,14.1,16.8,19.2,50
ISRO-GAGAN-FC-002,LOT-2026-A1,FC,11.8,13.5,15.9,18.4,50
ISRO-GAGAN-FC-001,LOT-2026-A1,FC,13.1,15.2,18.0,21.3,50
ISRO-GAGAN-FC-004,LOT-2026-A1,FC,12.9,14.8,17.5,20.1,50`
  },
  {
    id: 'invalid_range',
    name: '6. Invalid Range (min > max)',
    description: 'Datasheet boundaries inverted (datasheet_min=60, datasheet_max=50). Triggers INVALID_RANGE error.',
    expectedStatus: 'BLOCKED',
    expectedErrorType: 'INVALID_RANGE',
    csvText: `component_id,lot_id,subsystem,value_0h_ua,value_24h_ua,value_96h_ua,value_168h_ua,static_limit_ua,datasheet_min,datasheet_max
ISRO-GAGAN-FC-001,LOT-2026-A1,FC,12.4,14.1,16.8,19.2,50,0,50
ISRO-GAGAN-FC-002,LOT-2026-A1,FC,11.8,13.5,15.9,18.4,50,60,50
ISRO-GAGAN-FC-003,LOT-2026-A1,FC,12.1,13.9,16.2,18.7,50,0,50`
  },
  {
    id: 'invalid_unit',
    name: '7. Invalid Unit ("kV")',
    description: 'Unsupported unit "kV" specified for silicon leakage current. Triggers INVALID_UNIT error.',
    expectedStatus: 'BLOCKED',
    expectedErrorType: 'INVALID_UNIT',
    csvText: `component_id,lot_id,subsystem,value_0h_ua,value_24h_ua,value_96h_ua,value_168h_ua,static_limit_ua,unit
ISRO-GAGAN-FC-001,LOT-2026-A1,FC,12.4,14.1,16.8,19.2,50,uA
ISRO-GAGAN-FC-002,LOT-2026-A1,FC,11.8,13.5,15.9,18.4,50,kV
ISRO-GAGAN-FC-003,LOT-2026-A1,FC,12.1,13.9,16.2,18.7,50,uA`
  },
  {
    id: 'invalid_temperature',
    name: '8. Invalid Temperature (999°C)',
    description: 'Extreme unphysical temperature 999°C in temperature_c column. Triggers INVALID_TEMPERATURE error.',
    expectedStatus: 'BLOCKED',
    expectedErrorType: 'INVALID_TEMPERATURE',
    csvText: `component_id,lot_id,subsystem,value_0h_ua,value_24h_ua,value_96h_ua,value_168h_ua,static_limit_ua,temperature_c
ISRO-GAGAN-FC-001,LOT-2026-A1,FC,12.4,14.1,16.8,19.2,50,125
ISRO-GAGAN-FC-002,LOT-2026-A1,FC,11.8,13.5,15.9,18.4,50,999
ISRO-GAGAN-FC-003,LOT-2026-A1,FC,12.1,13.9,16.2,18.7,50,125`
  },
  {
    id: 'invalid_missing_value',
    name: '9. Missing Value (Empty lot_id)',
    description: 'Row 2 has empty/missing lot_id. Triggers MISSING_VALUE error and blocks AI screening.',
    expectedStatus: 'BLOCKED',
    expectedErrorType: 'MISSING_VALUE',
    csvText: `component_id,lot_id,subsystem,value_0h_ua,value_24h_ua,value_96h_ua,value_168h_ua,static_limit_ua
ISRO-GAGAN-FC-001,LOT-2026-A1,FC,12.4,14.1,16.8,19.2,50
ISRO-GAGAN-FC-002,,FC,11.8,13.5,15.9,18.4,50
ISRO-GAGAN-FC-003,LOT-2026-A1,FC,12.1,13.9,16.2,18.7,50`
  },
  {
    id: 'invalid_column_name',
    name: '10. Invalid Column Names',
    description: 'Header contains arbitrary unmapped garbage columns with missing core keys. Triggers INVALID_COLUMN_NAME error.',
    expectedStatus: 'BLOCKED',
    expectedErrorType: 'INVALID_COLUMN_NAME',
    csvText: `sensor_raw_tag,wafer_uuid_xyz,voltage_channel_a,random_notes
CH-01,W-09,1.23,test_notes
CH-02,W-09,1.45,test_notes`
  },
  {
    id: 'empty_file',
    name: '11. Empty File (0 Bytes)',
    description: 'Uploaded CSV file contains 0 bytes or zero records. Triggers EMPTY_FILE error.',
    expectedStatus: 'BLOCKED',
    expectedErrorType: 'EMPTY_FILE',
    csvText: ``
  },
  {
    id: 'invalid_file_format',
    name: '12. Invalid File Format (Corrupt)',
    description: 'File contains corrupted binary/non-CSV payload. Triggers INVALID_FILE_FORMAT error.',
    expectedStatus: 'BLOCKED',
    expectedErrorType: 'INVALID_FILE_FORMAT',
    csvText: `\x00\x01\x02\x03\xFF\xFE\xFD BINARY STREAM INVALID CSV`
  }
]

export function createTestCsvFile(fixtureId: string): File {
  const fixture = TEST_FIXTURES.find(f => f.id === fixtureId) || TEST_FIXTURES[0]
  const blob = new Blob([fixture.csvText], { type: 'text/csv;charset=utf-8;' })
  return new File([blob], `${fixture.id}.csv`, { type: 'text/csv' })
}

