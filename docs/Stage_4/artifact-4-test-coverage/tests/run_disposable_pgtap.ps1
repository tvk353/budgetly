# Budgetly Stage 4 draft test runner.
# Run only after separate approval against a disposable local PostgreSQL/Supabase DB.
# This script never applies migrations, creates Auth users, or prints connection credentials.

$ErrorActionPreference = 'Stop'

$psql = Get-Command psql -ErrorAction Stop
$databaseHost = $env:BUDGETLY_TEST_DB_HOST
$databasePort = $env:BUDGETLY_TEST_DB_PORT
$databaseName = $env:BUDGETLY_TEST_DB_NAME
$databaseUser = $env:BUDGETLY_TEST_DB_USER
$objectCreatingRole = $env:BUDGETLY_MIGRATION_ROLE

if ($env:BUDGETLY_TEST_ALLOW_DISPOSABLE -cne 'I_UNDERSTAND') {
  throw 'Set BUDGETLY_TEST_ALLOW_DISPOSABLE=I_UNDERSTAND only for an approved disposable local database.'
}
if ($databaseHost -notin @('localhost', '127.0.0.1', '::1')) {
  throw 'Refusing to connect: BUDGETLY_TEST_DB_HOST must be localhost, 127.0.0.1, or ::1.'
}
if ([string]::IsNullOrWhiteSpace($databasePort) -or
    [string]::IsNullOrWhiteSpace($databaseName) -or
    [string]::IsNullOrWhiteSpace($databaseUser) -or
    [string]::IsNullOrWhiteSpace($objectCreatingRole)) {
  throw 'Set BUDGETLY_TEST_DB_PORT, BUDGETLY_TEST_DB_NAME, BUDGETLY_TEST_DB_USER, and BUDGETLY_MIGRATION_ROLE.'
}
if ($databaseUser -cne $objectCreatingRole) {
  throw 'BUDGETLY_TEST_DB_USER must match BUDGETLY_MIGRATION_ROLE so default ACLs are tested for the correct object creator.'
}

$env:PGHOST = $databaseHost
$env:PGPORT = $databasePort
$env:PGDATABASE = $databaseName
$env:PGUSER = $databaseUser
$env:PGAPPNAME = 'budgetly-stage4-pgtap'
$env:PGOPTIONS = (($env:PGOPTIONS + ' -c budgetly.disposable_test=on').Trim())

$fixtureVariables = [ordered]@{
  user_a = '10000000-0000-4000-8000-000000000001'
  user_b = '10000000-0000-4000-8000-000000000002'
  user_c = '10000000-0000-4000-8000-000000000003'
  user_d = '10000000-0000-4000-8000-000000000004'
  user_e = '10000000-0000-4000-8000-000000000005'
  household_abc = '20000000-0000-4000-8000-000000000001'
  personal_a = '20000000-0000-4000-8000-000000000002'
  personal_b = '20000000-0000-4000-8000-000000000003'
  personal_c = '20000000-0000-4000-8000-000000000004'
  household_e = '20000000-0000-4000-8000-000000000005'
  builtin_category = '40000000-0000-4000-8000-000000000001'
  category_a = '40000000-0000-4000-8000-000000000002'
  category_unlinked = '40000000-0000-4000-8000-000000000003'
  ordinary_category = '40000000-0000-4000-8000-000000000004'
  tracker_category = '40000000-0000-4000-8000-000000000005'
  invitation_a = '65000000-0000-4000-8000-000000000001'
  expense_a = '60000000-0000-4000-8000-000000000001'
  expense_refund_case = '60000000-0000-4000-8000-000000000002'
  expense_update_case = '60000000-0000-4000-8000-000000000003'
  refund_update_case = '60000000-0000-4000-8000-000000000004'
  expense_reduce_case = '60000000-0000-4000-8000-000000000006'
  trash_transaction_case = '60000000-0000-4000-8000-000000000009'
  trash_refund_case = '60000000-0000-4000-8000-000000000014'
  fund_a = '64000000-0000-4000-8000-000000000001'
  savings_transaction_a = '61000000-0000-4000-8000-000000000001'
  tracker_a = '63000000-0000-4000-8000-000000000001'
  tracker_transaction_a = '62000000-0000-4000-8000-000000000001'
  tracker_id = '63000000-0000-4000-8000-000000000001'
  tracker_expense_refund_case = '62000000-0000-4000-8000-000000000002'
  tracker_refund_update_case = '62000000-0000-4000-8000-000000000003'
  label_a = '50000000-0000-4000-8000-000000000001'
  budget_a = '66000000-0000-4000-8000-000000000001'
  backup_job_id = '70000000-0000-4000-8000-000000000001'
  export_job_id = '70000000-0000-4000-8000-000000000002'
  empty_job_id = '70000000-0000-4000-8000-000000000003'
}

function Invoke-PsqlFile {
  param(
    [Parameter(Mandatory)] [string] $Path,
    [switch] $CheckTap
  )

  $arguments = @('-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1')
  foreach ($entry in $fixtureVariables.GetEnumerator()) {
    $arguments += @('-v', "$($entry.Key)=$($entry.Value)")
  }
  $arguments += @('-f', $Path)
  $output = & $psql.Source @arguments 2>&1
  $exitCode = $LASTEXITCODE
  $output | ForEach-Object { Write-Output $_ }
  if ($exitCode -ne 0) {
    throw "psql failed for $([IO.Path]::GetFileName($Path)) with exit code $exitCode."
  }
  if ($CheckTap -and ($output | Select-String -Pattern '^\s*not ok\s+\d+' -Quiet)) {
    throw "pgTAP reported a failing assertion in $([IO.Path]::GetFileName($Path))."
  }
}

function Invoke-PsqlExpectedSqlState {
  param(
    [Parameter(Mandatory)] [string] $Path,
    [Parameter(Mandatory)] [string] $SqlState
  )

  $arguments = @('-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1')
  foreach ($entry in $fixtureVariables.GetEnumerator()) {
    $arguments += @('-v', "$($entry.Key)=$($entry.Value)")
  }
  $arguments += @('-f', $Path)
  $output = & $psql.Source @arguments 2>&1
  $exitCode = $LASTEXITCODE
  $output | ForEach-Object { Write-Output $_ }
  $combinedOutput = $output -join "`n"
  if ($exitCode -eq 0 -or $combinedOutput -notmatch "(?m)\b$SqlState\b") {
    throw "Expected SQLSTATE $SqlState from $([IO.Path]::GetFileName($Path)); inspect the psql output above."
  }
}

$testDirectory = $PSScriptRoot
$cleanupPath = Join-Path $testDirectory 'fixture_cleanup.sql'
$fixtureCreated = $false

try {
  Invoke-PsqlFile (Join-Path $testDirectory 'fixture_setup.sql')
  $fixtureCreated = $true
  Invoke-PsqlFile (Join-Path $testDirectory '..\..\artifact-3-rls\tests\001_rls_authorization.pgtap.sql') -CheckTap
  Invoke-PsqlFile (Join-Path $testDirectory '001_business_logic_pgtap.draft.sql') -CheckTap
  Invoke-PsqlFile (Join-Path $testDirectory '003_future_object_defaults.pgtap.sql') -CheckTap
  Invoke-PsqlExpectedSqlState (Join-Path $testDirectory 'deferred_export_job_type_commit.psql') '23514'
  Invoke-PsqlExpectedSqlState (Join-Path $testDirectory 'deferred_export_workspace_commit.psql') '23514'
  Invoke-PsqlExpectedSqlState (Join-Path $testDirectory 'deferred_export_missing_detail_commit.psql') '23514'
}
finally {
  if ($fixtureCreated) {
    Invoke-PsqlFile $cleanupPath
  }
}
