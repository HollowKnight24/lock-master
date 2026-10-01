param([string]$Project=(Split-Path $PSScriptRoot -Parent))

Add-Type -AssemblyName System.Drawing
$ErrorActionPreference='Stop'

$asset=Join-Path $Project 'assets\resources\art\production\gameplay\lock_s.png'
$baseSource=Join-Path $Project 'art-sources\20260913\exec-57f6de18-f79b-41d0-b88a-6ed6c63a2f7f.png'
$sourceOut=Join-Path $Project 'art-sources\20260913\lock_s-geometric-source.png'
$input=[System.Drawing.Bitmap]::new($baseSource)
$output=[System.Drawing.Bitmap]::new(1079,1457,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics=[System.Drawing.Graphics]::FromImage($output)
$graphics.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.DrawImageUnscaled($input,0,0)

# Rebuild only the inner medallion so the former free-form S is completely
# removed while the generated lock body, shackle and outer rim stay intact.
$platePath=[System.Drawing.Drawing2D.GraphicsPath]::new()
$platePath.AddEllipse([System.Drawing.RectangleF]::new(234,522,610,610))
$plateBrush=[System.Drawing.Drawing2D.PathGradientBrush]::new($platePath)
$plateBrush.CenterPoint=[System.Drawing.PointF]::new(470,720)
$plateBrush.CenterColor=[System.Drawing.Color]::FromArgb(255,255,205,96)
$plateBrush.SurroundColors=[System.Drawing.Color[]]@([System.Drawing.Color]::FromArgb(255,222,91,28))
$graphics.FillPath($plateBrush,$platePath)
$plateEdge=[System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255,255,183,55),10)
$plateInner=[System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(150,255,232,142),3)
$graphics.DrawEllipse($plateEdge,[System.Drawing.RectangleF]::new(234,522,610,610))
$graphics.DrawEllipse($plateInner,[System.Drawing.RectangleF]::new(247,535,584,584))

# Runtime geometry: two equal semicircles, radius 112 Cocos units, joined at
# y=40. Convert the exact same points into the 1079x1457 source-image space.
$scaleX=1079.0/900.0
$scaleY=1457.0/1215.0
$points=[System.Collections.Generic.List[System.Drawing.PointF]]::new()
function Add-TrackPoint([double]$x,[double]$y) {
    $px=539.5+$x*$scaleX
    $py=728.5-($y-125.0)*$scaleY
    $points.Add([System.Drawing.PointF]::new([single]$px,[single]$py))
}
$radius=112.0;$centreY=40.0;$steps=128
for($i=0;$i -le $steps;$i++) {
    $angle=[Math]::PI/2+[Math]::PI*$i/$steps
    Add-TrackPoint ($radius*[Math]::Cos($angle)) ($centreY+$radius+$radius*[Math]::Sin($angle))
}
for($i=1;$i -le $steps;$i++) {
    $angle=[Math]::PI/2-[Math]::PI*$i/$steps
    Add-TrackPoint ($radius*[Math]::Cos($angle)) ($centreY-$radius+$radius*[Math]::Sin($angle))
}

function Draw-TrackStroke([System.Drawing.Color]$color,[single]$width) {
    $pen=[System.Drawing.Pen]::new($color,$width)
    $pen.StartCap=[System.Drawing.Drawing2D.LineCap]::Flat
    $pen.EndCap=[System.Drawing.Drawing2D.LineCap]::Flat
    $pen.LineJoin=[System.Drawing.Drawing2D.LineJoin]::Round
    $graphics.DrawLines($pen,$points.ToArray())
    $pen.Dispose()
}
Draw-TrackStroke ([System.Drawing.Color]::FromArgb(255,91,28,13)) 104
Draw-TrackStroke ([System.Drawing.Color]::FromArgb(255,255,176,49)) 94
Draw-TrackStroke ([System.Drawing.Color]::FromArgb(255,87,30,18)) 82
Draw-TrackStroke ([System.Drawing.Color]::FromArgb(255,67,42,35)) 70

$output.Save($sourceOut,[System.Drawing.Imaging.ImageFormat]::Png)
$plateInner.Dispose();$plateEdge.Dispose();$plateBrush.Dispose();$platePath.Dispose()
$graphics.Dispose();$output.Dispose();$input.Dispose()
Copy-Item -LiteralPath $sourceOut -Destination $asset -Force
Write-Output $asset
