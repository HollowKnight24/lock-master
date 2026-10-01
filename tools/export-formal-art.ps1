param([string]$Project=(Split-Path $PSScriptRoot -Parent))
# Mechanical sprite slicing only; no artwork is redrawn.
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference='Stop'
$source=Join-Path $Project 'art-sources\20260913'
$dest=Join-Path $Project 'assets\resources\art\production'
$masters=Join-Path $Project 'art-sources\20260913'
New-Item -ItemType Directory -Path $dest,$masters -Force | Out-Null
$manifest=[System.Collections.Generic.List[object]]::new()
function Export-Art([string]$id,[string]$name,[int[]]$crop,[int]$w,[int]$h,[bool]$fit=$true) {
 $file=Join-Path $source ('exec-'+$id+'.png')
 $inputBmp=[System.Drawing.Bitmap]::new($file)
 if (!$crop) {$crop=@(0,0,$inputBmp.Width,$inputBmp.Height)}
 $outputBmp=[System.Drawing.Bitmap]::new($w,$h,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $g=[System.Drawing.Graphics]::FromImage($outputBmp)
 $g.Clear([System.Drawing.Color]::Transparent)
 $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 $g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
 $dw=$w; $dh=$h
 if ($fit) {$ratio=[Math]::Min(($w-8)/$crop[2],($h-8)/$crop[3]);$dw=$crop[2]*$ratio;$dh=$crop[3]*$ratio}
 $rect=[System.Drawing.RectangleF]::new(($w-$dw)/2,($h-$dh)/2,$dw,$dh)
 $g.DrawImage($inputBmp,$rect,[System.Drawing.RectangleF]::new($crop[0],$crop[1],$crop[2],$crop[3]),[System.Drawing.GraphicsUnit]::Pixel)
 $outFile=Join-Path $dest ($name+'.png')
 New-Item -ItemType Directory -Path (Split-Path $outFile) -Force | Out-Null
 $outputBmp.Save($outFile,[System.Drawing.Imaging.ImageFormat]::Png)
 if ((Split-Path $file) -ne $masters) { Copy-Item -LiteralPath $file -Destination (Join-Path $masters (Split-Path $file -Leaf)) -Force }
 $manifest.Add([pscustomobject]@{path=$name+'.png';width=$w;height=$h;source=(Split-Path $file -Leaf);crop=$crop;transparent=($inputBmp.PixelFormat -eq [System.Drawing.Imaging.PixelFormat]::Format32bppArgb);sha256=(Get-FileHash -LiteralPath $outFile -Algorithm SHA256).Hash})
 $g.Dispose();$outputBmp.Dispose();$inputBmp.Dispose()
}
Export-Art 'bcc2c45f-96df-4590-8a47-c03b018a0e4d' 'background/bg_cartoon_dungeon' @() 1080 1920 $false
Export-Art '1a983131-737f-49a6-8e4f-f85571e60635' 'characters/mascot_idle' @() 768 832
Export-Art 'b4f189f7-fb9b-4a77-a5d2-12afed72e0ba' 'characters/mascot_win' @(0,0,887,887) 640 640
Export-Art 'b4f189f7-fb9b-4a77-a5d2-12afed72e0ba' 'characters/mascot_lose' @(887,0,887,887) 640 640
# Body center in lock masters is near y=510, not canvas center; runtime compensates visually.
Export-Art '552f9c7f-e9f3-42cd-9ea0-234532123916' 'gameplay/lock_vertical' @(0,0,627,836) 640 864
Export-Art '552f9c7f-e9f3-42cd-9ea0-234532123916' 'gameplay/lock_half' @(627,0,627,836) 640 864
Export-Art '552f9c7f-e9f3-42cd-9ea0-234532123916' 'gameplay/lock_full' @(1254,0,628,836) 640 864
Export-Art 'fea6ed20-a85d-42ef-8142-6a26c75bdc96' 'ui/panel_wood' @() 896 1024
# All three tracks share the same simple silver needle; linear is a path alias.
Export-Art '8e9a74a9-5f4d-40e0-befc-eba3f9c79b76' 'gameplay/pointer_linear' @(430,55,165,1425) 128 448
Export-Art '8e9a74a9-5f4d-40e0-befc-eba3f9c79b76' 'gameplay/pointer_radial' @(430,55,165,1425) 128 448
# First-level rails use true rectangular target slabs: crop away the generated outer-corner falloff.
Export-Art 'a2940996-195b-44b0-807d-1cb4b39e2981' 'gameplay/zone_yellow_linear' @(80,170,2012,340) 384 128 $false
Export-Art '876811b2-f74c-4315-aee3-2ad0a43cf8f2' 'gameplay/zone_blue_linear' @(80,170,2012,340) 384 128 $false
Export-Art 'ec784159-a6cf-477a-910e-3ebdc549ff65' 'gameplay/zone_yellow_ring' @() 512 512
Export-Art 'c6807dc2-1f1a-45e4-890b-042a71756117' 'gameplay/zone_blue_ring' @() 512 512
Export-Art 'a8f7376b-7d46-4f8f-b7d1-8af6636fe086' 'branding/logo_lockmaster' @() 1024 512
Export-Art 'fe976ca2-aea1-4e62-9676-fff0adc32d2d' 'sharing/share_cover' @() 1000 800 $false
$icons=@('play','rank','share','normal','challenge','close','home','restart','next','revive','unlock','speed','time','score','locked')
$iconCrops=@(@(30,35,280,300),@(330,35,300,300),@(650,30,290,310),@(962,35,318,300),@(1285,35,334,300),@(25,350,282,272),@(323,345,309,280),@(650,345,292,285),@(985,370,278,245),@(1275,332,344,302),@(30,630,285,310),@(333,660,299,264),@(654,632,284,300),@(945,635,352,305),@(1315,635,280,305))
for($i=0;$i -lt $icons.Length;$i++) {
 Export-Art '64174a9d-d1e3-48ea-b1d5-c10af4d36d4e' ('ui/icon_'+$icons[$i]) $iconCrops[$i] 192 192
}
$tones=@('gold','cyan','disabled','red')
for($i=0;$i -lt 4;$i++) { Export-Art 'aa214f05-2fd1-4bf2-9a48-edf219b9ac02' ('ui/button_'+$tones[$i]) @(500,($i*202),950,202) 640 144 }
Export-Art '31802c73-07c8-46f3-8065-6b4ebc0b5f3f' 'ui/panel_rank' @() 1024 1088
Export-Art '99a3d594-44dd-4208-b0a4-7c874ff9f1db' 'effects/fx_success' @(100,70,670,720) 320 320
Export-Art '99a3d594-44dd-4208-b0a4-7c874ff9f1db' 'effects/fx_miss' @(980,70,740,720) 320 320
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $masters 'asset-manifest.json') -Encoding utf8
Write-Output ('Exported '+$manifest.Count+' assets')
