# E2E test for outline / outlineAppend API (bypass browser dev-mode flakiness)
$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# 1. Login (NextAuth credentials flow)
$csrfResp = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/csrf" -WebSession $s -UseBasicParsing
$csrfToken = ($csrfResp.Content | ConvertFrom-Json).csrfToken
$loginBody = @{ email = "test-outline-888@test.com"; password = "Test123456"; csrfToken = $csrfToken; json = "true" }
try {
  $null = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/callback/credentials" -Method POST -WebSession $s -Body $loginBody -ContentType "application/x-www-form-urlencoded" -UseBasicParsing
} catch {
  # NextAuth callback may return 302; check session next
}
$session = (Invoke-WebRequest -Uri "http://localhost:3000/api/auth/session" -WebSession $s -UseBasicParsing).Content | ConvertFrom-Json
if (-not $session.user.email) { Write-Output "LOGIN FAILED"; exit 1 }
Write-Output "LOGIN OK: $($session.user.email)"

$projectId = "c5ca3108-45bc-4ae1-ad46-fe657a50d751"

# 2. Test outline generation
Write-Output ""
Write-Output "=== TEST outline ==="
$genBody = @{
  action    = "outline"
  projectId = $projectId
  payload   = @{ worldSummary = ""; characterSummary = ""; genre = "dushi-xiaoyuan"; template = "san-mu-shi" }
} | ConvertTo-Json -Depth 5
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$genResp = Invoke-WebRequest -Uri "http://localhost:3000/api/ai/generate" -Method POST -WebSession $s -Body $genBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 300
$sw.Stop()
Write-Output "status=$($genResp.StatusCode) elapsed=$([int]$sw.Elapsed.TotalSeconds)s len=$($genResp.Content.Length)"

$doneText = $null
foreach ($block in ($genResp.Content -split "`n`n")) {
  if ($block -match 'event: done') {
    $jsonLine = ($block -split "`n" | Where-Object { $_ -like "data: *" }) -join ""
    $data = $jsonLine.Substring(6) | ConvertFrom-Json
    $doneText = $data.text
  }
}
if (-not $doneText) { Write-Output "NO done event"; exit 1 }
# strip markdown fences like client tryParse does
$cleanGen = ($doneText -replace '```json', '' -replace '```', '').Trim()
$parsed = $null
try { $parsed = $cleanGen | ConvertFrom-Json } catch {}
if ($null -eq $parsed) {
  $m = [regex]::Match($cleanGen, '\[[\s\S]*\]')
  if ($m.Success) { try { $parsed = $m.Value | ConvertFrom-Json } catch {} }
}
if ($parsed -is [System.Array]) {
  Write-Output "outline PARSE OK: $($parsed.Count) items"
  $existing = @()
  foreach ($o in $parsed) {
    Write-Output "  ch$($o.chapter): $($o.sceneTitle)"
    $existing += @{ chapter = $o.chapter; sceneTitle = "$($o.sceneTitle)"; sceneSummary = "$($o.sceneSummary)"; povCharacter = "$($o.povCharacter)"; plotPoints = @($o.plotPoints); foreshadowing = "$($o.foreshadowing)" }
  }
} else {
  Write-Output "outline PARSE FAIL"
  Write-Output "--- cleanGen length: $($cleanGen.Length) ---"
  Write-Output "--- cleanGen LAST 400 chars ---"
  Write-Output $cleanGen.Substring([Math]::Max(0, $cleanGen.Length - 400))
  [System.IO.File]::WriteAllText("$PWD\scripts\tmp-outline-out.txt", $doneText, (New-Object System.Text.UTF8Encoding($false)))
  Write-Output "--- raw saved to scripts\tmp-outline-out.txt ---"
  exit 1
}

# 3. Test outlineAppend
Write-Output ""
Write-Output "=== TEST outlineAppend ==="
$lastChapter = ($existing | ForEach-Object { $_.chapter } | Measure-Object -Maximum).Maximum
Write-Output "lastChapter=$lastChapter, appending..."
$appendBody = @{
  action    = "outlineAppend"
  projectId = $projectId
  payload   = @{ worldSummary = ""; characterSummary = ""; genre = "dushi-xiaoyuan"; template = "san-mu-shi"; existingOutlines = $existing }
} | ConvertTo-Json -Depth 8
$sw2 = [System.Diagnostics.Stopwatch]::StartNew()
$appendResp = Invoke-WebRequest -Uri "http://localhost:3000/api/ai/generate" -Method POST -WebSession $s -Body $appendBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 300
$sw2.Stop()
Write-Output "status=$($appendResp.StatusCode) elapsed=$([int]$sw2.Elapsed.TotalSeconds)s len=$($appendResp.Content.Length)"

$appendText = $null
foreach ($block in ($appendResp.Content -split "`n`n")) {
  if ($block -match 'event: done') {
    $jsonLine = ($block -split "`n" | Where-Object { $_ -like "data: *" }) -join ""
    $data = $jsonLine.Substring(6) | ConvertFrom-Json
    $appendText = $data.text
  }
}
if (-not $appendText) { Write-Output "NO done event"; exit 1 }
# strip markdown fences like client tryParse does
$cleanAppend = ($appendText -replace '```json', '' -replace '```', '').Trim()
$appendParsed = $null
try { $appendParsed = $cleanAppend | ConvertFrom-Json } catch {}
if ($null -eq $appendParsed) {
  $m2 = [regex]::Match($cleanAppend, '\[[\s\S]*\]')
  if ($m2.Success) { try { $appendParsed = $m2.Value | ConvertFrom-Json } catch {} }
}
if ($appendParsed -is [System.Array] -and $appendParsed.Count -gt 0) {
  Write-Output "outlineAppend PARSE OK: $($appendParsed.Count) items"
  foreach ($o in $appendParsed) {
    Write-Output "  ch$($o.chapter): $($o.sceneTitle)"
  }
  $minCh = ($appendParsed | ForEach-Object { $_.chapter } | Measure-Object -Minimum).Minimum
  if ($minCh -gt $lastChapter) { Write-Output "chapter continuity OK (from $minCh > $lastChapter)" } else { Write-Output "chapter continuity BAD (from $minCh, expected > $lastChapter)" }
} else {
  Write-Output "outlineAppend PARSE FAIL, first 300 chars:"
  Write-Output $appendText.Substring(0, [Math]::Min(300, $appendText.Length))
}
