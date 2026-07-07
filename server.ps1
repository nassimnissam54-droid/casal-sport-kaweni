# ═══════════════════════════════════════════════
#  CASAL SPORT KAWENI — Serveur HTTP statique PowerShell
#  Préview locale uniquement (les Netlify Functions ne tournent pas ici :
#  le checkout passe en mode démo). N'est pas déployé.
# ═══════════════════════════════════════════════

$port = 3338
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

$mimes = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.mjs'  = 'application/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.webp' = 'image/webp'
    '.ico'  = 'image/x-icon'
    '.glb'  = 'model/gltf-binary'
    '.woff2'= 'font/woff2'
    '.ttf'  = 'font/ttf'
    '.xml'  = 'application/xml'
    '.txt'  = 'text/plain'
}

$http = [System.Net.HttpListener]::new()
$http.Prefixes.Add("http://localhost:$port/")
$http.Start()
Write-Host "Casal Sport OK -> http://localhost:$port" -ForegroundColor Green

$realRoot = (Resolve-Path $root).Path

while ($http.IsListening) {
    $ctx = $null
    try { $ctx = $http.GetContext() } catch { break }
    $req = $ctx.Request
    $res = $ctx.Response

    try {
        $urlPath = $req.Url.LocalPath
        if ($urlPath -eq '/' -or $urlPath -eq '') { $urlPath = '/index.html' }

        $rel  = $urlPath.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
        $full = Join-Path $root $rel

        try   { $real = (Resolve-Path $full -ErrorAction Stop).Path }
        catch { $real = $null }

        if ($real -and $real.StartsWith($realRoot) -and (Test-Path $real -PathType Leaf)) {
            $bytes = [IO.File]::ReadAllBytes($real)
            $ext   = [IO.Path]::GetExtension($real).ToLower()
            $mime  = if ($mimes[$ext]) { $mimes[$ext] } else { 'application/octet-stream' }
            $res.StatusCode       = 200
            $res.ContentType      = $mime
            $res.ContentLength64  = $bytes.LongLength
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $bytes = [Text.Encoding]::UTF8.GetBytes('404 - Page introuvable')
            $res.StatusCode = 404; $res.ContentType = 'text/plain'
            $res.ContentLength64 = $bytes.LongLength
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        }
    } catch {
        try { $res.StatusCode = 500 } catch {}
    } finally {
        try { $res.Close() } catch {}
    }
}
$http.Stop()
