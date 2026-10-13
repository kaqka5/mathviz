# ============================================================
#  数学题图解工坊 · 本地 HTTP 服务器
#  用法：  powershell -NoProfile -ExecutionPolicy Bypass -File server.ps1
#         可选参数： -Port 8123   -NoBrowser   -Lan（同一局域网的人也能访问）
#  特点：只用 Windows 自带的 .NET / PowerShell，不需要 Node、Python，
#        不需要管理员权限。默认只监听 127.0.0.1（外网访问不到）。
# ============================================================
param(
  [int]$Port = 8123,
  [switch]$NoBrowser,
  [switch]$Lan
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootFull = (Resolve-Path $Root).Path

# ---------- 自动选一个空闲端口 ----------
$bindIp = if ($Lan) { [System.Net.IPAddress]::Any } else { [System.Net.IPAddress]::Loopback }
$listener = $null
$chosen = 0
foreach ($p in $Port..($Port + 20)) {
  try {
    $try = New-Object System.Net.Sockets.TcpListener($bindIp, $p)
    $try.Start()
    $listener = $try
    $chosen = $p
    break
  } catch {
    if ($try) { try { $try.Stop() } catch { } }
  }
}
if (-not $listener) {
  Write-Host "没有找到可用端口（试过 $Port 到 $($Port + 20)）。" -ForegroundColor Red
  exit 1
}

$url = "http://127.0.0.1:$chosen/"
Write-Host ""
Write-Host "  数学题图解工坊已启动" -ForegroundColor Green
Write-Host "  本机网址： $url" -ForegroundColor Cyan
if ($Lan) {
  $lanIps = @()
  try {
    $lanIps = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
      Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
      Select-Object -ExpandProperty IPAddress -Unique
  } catch { }
  if (-not $lanIps -or @($lanIps).Count -eq 0) {
    try {
      $lanIps = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
        Where-Object { $_.AddressFamily -eq 'InterNetwork' } |
        ForEach-Object { $_.IPAddressToString }
    } catch { }
  }
  if ($lanIps -and @($lanIps).Count -gt 0) {
    Write-Host "  局域网地址（同一个 WiFi 下的手机/电脑用它）：" -ForegroundColor Cyan
    foreach ($ip in $lanIps) { Write-Host "      http://${ip}:$chosen/" -ForegroundColor Yellow }
    Write-Host "  提示：第一次启动若弹出 Windows 防火墙提示，请勾选「专用网络」再点「允许访问」。" -ForegroundColor DarkGray
  } else {
    Write-Host "  没读到局域网 IP，请用 ipconfig 查看本机地址后拼接端口 $chosen。" -ForegroundColor Yellow
  }
}
Write-Host "  根目录： $rootFull"
Write-Host "  停止： 在本窗口按 Ctrl+C"
Write-Host ""

if (-not $NoBrowser) {
  try { Start-Process $url | Out-Null } catch { }
}

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.htm'  = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.gif'  = 'image/gif'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
  '.md'   = 'text/markdown; charset=utf-8'
  '.txt'  = 'text/plain; charset=utf-8'
}

while ($true) {
  $client = $listener.AcceptTcpClient()
  $client.NoDelay = $true
  try {
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
    $requestLine = $reader.ReadLine()
    if (-not $requestLine) { $client.Close(); continue }
    # 读完请求头（不需要请求体：本站只有 GET）
    while ($true) {
      $line = $reader.ReadLine()
      if ($line -eq $null -or $line -eq '') { break }
    }

    $parts = $requestLine.Split(' ')
    $rawPath = if ($parts.Length -ge 2) { $parts[1] } else { '/' }
    $rawPath = $rawPath.Split('?')[0]
    $rawPath = [System.Uri]::UnescapeDataString($rawPath)
    if ($rawPath -eq '' -or $rawPath -eq '/') { $rawPath = '/index.html' }

    $rel = $rawPath.TrimStart('/') -replace '/', '\'
    $full = [System.IO.Path]::GetFullPath((Join-Path $rootFull $rel))
    # 目录地址自动找 index.html（与真实静态托管一致，也方便模拟子路径部署）
    if (Test-Path -LiteralPath $full -PathType Container) {
      $full = Join-Path $full 'index.html'
    }

    $status = '200 OK'
    $bytes = $null
    $ctype = 'application/octet-stream'

    # 防目录穿越
    if (-not $full.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
      $status = '403 Forbidden'
      $bytes = [System.Text.Encoding]::UTF8.GetBytes('403 Forbidden')
      $ctype = 'text/plain; charset=utf-8'
    } elseif (Test-Path -LiteralPath $full -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      if ($mime.ContainsKey($ext)) { $ctype = $mime[$ext] }
    } else {
      $status = '404 Not Found'
      $bytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rawPath")
      $ctype = 'text/plain; charset=utf-8'
    }

    $header = "HTTP/1.1 $status`r`n" +
              "Content-Type: $ctype`r`n" +
              "Content-Length: $($bytes.Length)`r`n" +
              "Cache-Control: no-store`r`n" +
              "Connection: close`r`n" +
              "`r`n"
    $hb = [System.Text.Encoding]::ASCII.GetBytes($header)
    $stream.Write($hb, 0, $hb.Length)
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Flush()
    Write-Host ("  {0,-4} {1}" -f $status.Substring(0, 3), $rawPath)
  } catch {
    # 单个请求出错不影响继续服务
  } finally {
    try { $client.Close() } catch { }
  }
}
